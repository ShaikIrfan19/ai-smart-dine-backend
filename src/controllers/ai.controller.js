const { GoogleGenerativeAI } = require('@google/generative-ai');
const MenuItem = require('../models/MenuItem.model');
const Order = require('../models/Order.model');
const Table = require('../models/Table.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @POST /api/ai/recommendations
const getFoodRecommendations = async (req, res) => {
  try {
    const { restaurantId, orderedItems, tableType, timeOfDay } = req.body;

    // Get menu items for context
    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true })
      .select('name category price isVeg spicyLevel rating totalOrders isPopular')
      .sort({ totalOrders: -1 })
      .limit(30);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a smart restaurant AI assistant for "AI Smart Dine". 
    
    Current menu items (top sellers): ${JSON.stringify(menuItems.map(m => ({ name: m.name, category: m.category, price: m.price, isVeg: m.isVeg, rating: m.rating, orders: m.totalOrders })))}
    
    Customer already ordered: ${JSON.stringify(orderedItems || [])}
    Table type: ${tableType || 'regular'}
    Time of day: ${timeOfDay || new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
    
    Based on this, provide:
    1. Top 3 food recommendations with reasons
    2. One combo suggestion that saves money
    3. A friendly insight about popular items today
    
    Respond in JSON format:
    {
      "recommendations": [{ "name": "...", "reason": "...", "category": "..." }],
      "combo": { "items": ["...", "..."], "savings": "₹XX", "message": "..." },
      "insight": "...",
      "greeting": "..."
    }
    
    Keep it concise and friendly. Prices in ₹ INR only.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      parsed = {
        recommendations: menuItems.slice(0, 3).map(m => ({ name: m.name, reason: 'Top rated item', category: m.category })),
        combo: { items: [menuItems[0]?.name, menuItems[1]?.name], savings: '₹50', message: 'Popular combo today!' },
        insight: `Today's top seller is ${menuItems[0]?.name}`,
        greeting: 'Welcome! Here are our recommendations for you.',
      };
    }

    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI service temporarily unavailable', error: error.message });
  }
};

// @POST /api/ai/chatbot
const chatWithAI = async (req, res) => {
  try {
    const { message, restaurantId, conversationHistory } = req.body;

    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true })
      .select('name category price isVeg description rating')
      .limit(20);

    const tables = await Table.find({ restaurantId, status: 'available' });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemContext = `You are "Dine AI", a helpful restaurant assistant for AI Smart Dine. 
    
    Available menu (sample): ${JSON.stringify(menuItems.slice(0, 10).map(m => ({ name: m.name, price: `₹${m.price}`, isVeg: m.isVeg, category: m.category })))}
    Available tables: ${tables.length} tables currently free
    
    Be helpful, friendly, and concise. If asked about unavailable items, suggest alternatives.
    Always mention prices in ₹ INR. Keep responses under 100 words.`;

    const history = (conversationHistory || []).map(h => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood! I am Dine AI, ready to help.' }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    res.json({ success: true, data: { response, timestamp: new Date() } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Chatbot temporarily unavailable' });
  }
};

// @GET /api/ai/insights/:restaurantId
const getRestaurantInsights = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, topItems, hourlyData] = await Promise.all([
      Order.find({ restaurantId, createdAt: { $gte: today }, paymentStatus: 'paid' }),
      Order.aggregate([
        { $match: { restaurantId: require('mongoose').Types.ObjectId.createFromHexString(restaurantId), createdAt: { $gte: today } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { restaurantId: require('mongoose').Types.ObjectId.createFromHexString(restaurantId), createdAt: { $gte: today } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { '_id': 1 } },
      ]),
    ]);

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const peakHour = hourlyData.sort((a, b) => b.count - a.count)[0];

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Restaurant stats for today:
    - Total revenue: ₹${todayRevenue.toFixed(2)}
    - Total orders: ${todayOrders.length}
    - Top selling items: ${topItems.map(i => i._id).join(', ')}
    - Peak hour: ${peakHour ? `${peakHour._id}:00` : 'No peak yet'}
    
    Give 3 actionable business insights in JSON format:
    { "insights": [{ "title": "...", "description": "...", "type": "positive/warning/tip" }], "summary": "..." }`;

    const result = await model.generateContent(prompt);
    let insights;
    try {
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
      insights = JSON.parse(jsonMatch[0]);
    } catch {
      insights = {
        insights: [
          { title: `Revenue Today`, description: `₹${todayRevenue.toFixed(2)} earned today`, type: 'positive' },
          { title: 'Top Seller', description: topItems[0]?._id || 'No data yet', type: 'tip' },
          { title: 'Orders Today', description: `${todayOrders.length} orders processed`, type: 'positive' },
        ],
        summary: `Good performance today with ${todayOrders.length} orders.`,
      };
    }

    res.json({
      success: true,
      data: {
        ...insights,
        stats: { todayRevenue, todayOrders: todayOrders.length, topItems, peakHour: peakHour?._id },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/ai/table-suggestion
const suggestTable = async (req, res) => {
  try {
    const { restaurantId, guestCount, preferences, timeSlot } = req.body;

    const availableTables = await Table.find({
      restaurantId,
      status: 'available',
      seatingCapacity: { $gte: guestCount },
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Customer needs a table for ${guestCount} people at ${timeSlot || 'now'}.
    Preferences: ${preferences || 'none'}
    Available tables: ${JSON.stringify(availableTables.map(t => ({ number: t.tableNumber, type: t.tableType, capacity: t.seatingCapacity, features: t.features })))}
    
    Suggest the best table and explain why in JSON:
    { "tableId": "...", "tableNumber": "...", "reason": "...", "alternatives": ["T2", "T5"] }`;

    const result = await model.generateContent(prompt);
    let suggestion;
    try {
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
      suggestion = JSON.parse(jsonMatch[0]);
    } catch {
      const best = availableTables[0];
      suggestion = {
        tableId: best?._id,
        tableNumber: best?.tableNumber,
        reason: `Table ${best?.tableNumber} is the best available for your group.`,
        alternatives: availableTables.slice(1, 3).map(t => t.tableNumber),
      };
    }

    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getFoodRecommendations, chatWithAI, getRestaurantInsights, suggestTable };
