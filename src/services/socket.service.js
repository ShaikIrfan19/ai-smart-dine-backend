module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join restaurant room
    socket.on('join_restaurant', (restaurantId) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`📍 Socket ${socket.id} joined restaurant: ${restaurantId}`);
    });

    // Join user room (for personal notifications)
    socket.on('join_user', (userId) => {
      socket.join(`user:${userId}`);
    });

    // Join table room (for table-specific updates)
    socket.on('join_table', ({ restaurantId, tableId }) => {
      socket.join(`table:${restaurantId}:${tableId}`);
    });

    // Kitchen: mark item as ready
    socket.on('item_ready', ({ restaurantId, orderId, itemId, itemName }) => {
      io.to(`restaurant:${restaurantId}`).emit('item_ready', { orderId, itemId, itemName, timestamp: new Date() });
    });

    // Waiter: call from customer
    socket.on('call_waiter', ({ restaurantId, tableId, tableNumber, message }) => {
      io.to(`restaurant:${restaurantId}`).emit('waiter_called', {
        tableId,
        tableNumber,
        message: message || 'Customer needs assistance',
        timestamp: new Date(),
      });
    });

    // Table status update
    socket.on('table_status_update', ({ restaurantId, tableId, status }) => {
      io.to(`restaurant:${restaurantId}`).emit('table_updated', { tableId, status, timestamp: new Date() });
    });

    // Kitchen display: order status
    socket.on('kitchen_update', ({ restaurantId, orderId, status, message }) => {
      io.to(`restaurant:${restaurantId}`).emit('kitchen_status', { orderId, status, message, timestamp: new Date() });
    });

    // Typing in chat
    socket.on('typing', ({ restaurantId, tableId }) => {
      socket.to(`restaurant:${restaurantId}`).emit('user_typing', { tableId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
