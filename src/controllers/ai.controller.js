const Groq = require('groq-sdk');
const MenuItem = require('../models/MenuItem.model');
const Order = require('../models/Order.model');
const Table = require('../models/Table.model');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama3-8b-8192';

// @POST /api/ai/recommendations
const getFoodRecommendations = async (req, res) => {
  try {
    const { restaurantId, orderedItems, tableType, timeOfDay } = req.body;

    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true })
      .select('name category price isVeg spicyLevel rating totalOrders isPopular')
      .sort({ totalOrders: -1 })
      .limit(30);

    const prompt = `You are a smart restaurant AI assistant for "AI Smart Dine". 
    
    Current menu items: ${JSON.stringify(menuItems.map(m => ({ name: m.name, category: m.category, price: m.price, isVeg: m.isVeg, rating: m.rating, orders: m.totalOrders })))}
    
    Customer already ordered: ${JSON.stringify(orderedItems || [])}
    Table type: ${tableType || 'regular'}
    Time of day: ${timeOfDay || new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
    
    Provide:
    1. Top 3 food recommendations with reasons
    2. One combo suggestion that saves money
    3. A friendly insight about popular items today
    
    Respond STRICTLY with ONLY a JSON object in this format (no markdown, no extra text):
    {
      "recommendations": [{ "name": "...", "reason": "...", "category": "..." }],
      "combo": { "items": ["...", "..."], "savings": "₹XX", "message": "..." },
      "insight": "...",
      "greeting": "..."
    }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
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

    const systemContext = `You are "Dine AI", a helpful restaurant assistant for AI Smart Dine. 
    
    Available menu (sample): ${JSON.stringify(menuItems.slice(0, 10).map(m => ({ name: m.name, price: '₹' + m.price, isVeg: m.isVeg, category: m.category })))}
    Available tables: ${tables.length} tables currently free
    
    Be helpful, friendly, and concise. If asked about unavailable items, suggest alternatives.
    Always mention prices in ₹ INR. Keep responses under 100 words.`;

    const history = (conversationHistory || []).map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.text,
    }));

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemContext },
        { role: 'assistant', content: 'Understood! I am Dine AI, ready to help.' },
        ...history,
        { role: 'user', content: message }
      ],
      model: MODEL,
    });

    const response = completion.choices[0]?.message?.content || 'I am sorry, I am having trouble understanding that right now.';
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

    const prompt = `Restaurant stats for today:
    - Total revenue: ₹${todayRevenue.toFixed(2)}
    - Total orders: ${todayOrders.length}
    - Top selling items: ${topItems.map(i => i._id).join(', ')}
    - Peak hour: ${peakHour ? peakHour._id + ':00' : 'No peak yet'}
    
    Give 3 actionable business insights. Respond STRICTLY with ONLY a JSON object in this format:
    { "insights": [{ "title": "...", "description": "...", "type": "positive/warning/tip" }], "summary": "..." }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    res.json({
      success: true,
      data: {
        ...parsed,
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

    const prompt = `Customer needs a table for ${guestCount} people at ${timeSlot || 'now'}.
    Preferences: ${preferences || 'none'}
    Available tables: ${JSON.stringify(availableTables.map(t => ({ number: t.tableNumber, type: t.tableType, capacity: t.seatingCapacity, features: t.features })))}
    
    Suggest the best table and explain why. Respond STRICTLY with ONLY a JSON object in this format:
    { "tableId": "...", "tableNumber": "...", "reason": "...", "alternatives": ["T2", "T5"] }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getFoodRecommendations, chatWithAI, getRestaurantInsights, suggestTable };
