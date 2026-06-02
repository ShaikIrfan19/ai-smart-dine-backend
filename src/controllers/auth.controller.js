const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { sendEmail } = require('../services/email.service');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const generateRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });

// @POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const allowedRoles = ['customer', 'waiter', 'restaurant_admin'];
    const userRole = allowedRoles.includes(role) ? role : 'customer';

    const user = await User.create({ name, email, phone, password, role: userRole });

    const otp = user.generateOTP();
    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: 'Verify your AI Smart Dine account',
        html: `<h2>Welcome to AI Smart Dine!</h2><p>Your OTP is: <strong>${otp}</strong></p><p>Valid for ${process.env.OTP_EXPIRE} minutes.</p>`,
      });
    } catch (e) { console.log('Email send failed:', e.message); }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: { userId: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar,
          restaurantId: user.restaurantId,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpire: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, message: 'Email verified successfully.', data: { token } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    const otp = user.generateOTP();
    await user.save();

    await sendEmail({
      to: email,
      subject: 'Reset your AI Smart Dine password',
      html: `<h2>Password Reset</h2><p>Your OTP is: <strong>${otp}</strong></p><p>Valid for ${process.env.OTP_EXPIRE} minutes.</p>`,
    });

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email, otp, otpExpire: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/auth/firebase-login (Google/Phone login)
const firebaseLogin = async (req, res) => {
  try {
    const { firebaseUid, email, phone, name, avatar, provider } = req.body;

    let user = await User.findOne({ $or: [{ firebaseUid }, { email }].filter(Boolean) });

    if (!user) {
      user = await User.create({
        name: name || 'User',
        email,
        phone,
        firebaseUid,
        avatar,
        isEmailVerified: true,
        isPhoneVerified: provider === 'phone',
        role: 'customer',
      });
    } else {
      user.firebaseUid = firebaseUid;
      user.lastLogin = new Date();
      if (avatar && !user.avatar) user.avatar = avatar;
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

    const newToken = generateToken(user._id);
    res.json({ success: true, data: { token: newToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
};

// @GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).populate('restaurantId', 'name logo');
  res.json({ success: true, data: user });
};

module.exports = { register, login, verifyOTP, forgotPassword, resetPassword, firebaseLogin, refreshToken, getMe };
