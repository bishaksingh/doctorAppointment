const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware");
const Appointment = require("../models/appointmentModel");
const moment = require("moment");
// Register API
router.post("/register", async (req, res) => {
  try {
    // Check if the user already exists
    const userExist = await User.findOne({ email: req.body.email });
    if (userExist) {
      return res
        .status(200)
        .send({ message: "User already exists", success: false });
    }

    // Hash the password
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    req.body.password = hashedPassword;

    // Save the new user
    const newUser = new User(req.body);
    await newUser.save();

    res
      .status(200)
      .send({ message: "User created successfully", success: true });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .send({ message: "Error creating user", success: false, error });
  }
});

// Login API
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(200)
        .send({ message: "User does not exist", success: false });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res
        .status(200)
        .send({ message: "Password is incorrect", success: false });
    } else {
      // Generate a JWT token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      // Include the token in the response
      res
        .status(200)
        .send({ message: "Login successful", success: true, token });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res
      .status(500)
      .send({ message: "Error logging in", success: false, error });
  }
});

// Get user info by ID
router.post("/get-user-info-by-id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId });
    user.password = undefined;
    if (!user) {
      return res
        .status(200)
        .send({ message: "User does not exist", success: false });
    } else {
      res.status(200).send({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error getting user info", success: false, error });
  }
});

// Apply for doctor account
router.post("/apply-doctor-account", authMiddleware, async (req, res) => {
  try {
    const newdoctor = new Doctor({ ...req.body, status: "pending" });
    await newdoctor.save();
    const adminUser = await User.findOne({ isAdmin: true });

    const unseenNotification = adminUser.unseenNotification;
    unseenNotification.push({
      type: "new-doctor-request",
      message: `${newdoctor.firstName} ${newdoctor.lastName} has applied for a doctor account`,
      data: {
        doctorId: newdoctor._id,
        name: newdoctor.firstName + " " + newdoctor.lastName,
      },
      onClickPath: "/admin/doctorslist",
    });

    await User.findByIdAndUpdate(adminUser._id, { unseenNotification });

    res.status(200).send({
      success: true,
      message: "Doctor account applied successfully",
    });
  } catch (error) {
    console.error("Error applying for doctor account:", error);
    res.status(500).send({
      message: "Error applying for doctor account",
      success: false,
      error,
    });
  }
});

router.post(
  "/mark-all-notification-as-seen",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.body.userId }); // Fixed `findone` to `findOne`
      const unseenNotification = user.unseenNotification;
      const seenNotification = user.seenNotification;
      seenNotification.push(...unseenNotification);
      user.unseenNotification = [];
      user.seenNotification = seenNotification;
      const updatedUser = await user.save();
      updatedUser.password = undefined;
      res.status(200).send({
        success: true,
        message: "All notifications marked as seen",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error marking notifications as seen:", error); // Corrected error message
      res.status(500).send({
        message: "Error marking notifications as seen",
        success: false,
        error,
      });
    }
  }
);

router.post("/delete-all-notification", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.userId }); // Fixed `findone` to `findOne`
    user.seenNotification = [];
    user.unseenNotification = [];
    const updatedUser = await user.save();
    updatedUser.password = undefined;
    res.status(200).send({
      success: true,
      message: "All notifications cleared",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error deleting notifications:", error); // Corrected error message
    res.status(500).send({
      message: "Error deleting notifications",
      success: false,
      error,
    });
  }
});

router.get("/get-all-approved-doctors", authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: "approved" });
    res.status(200).send({
      message: "Doctors fetched successfully",
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).send({
      message: "Error fetching doctors",
      success: false,
      error,
    });
  }
});

router.post("/book-appointment", authMiddleware, async (req, res) => {
  try {
    req.body.status = "pending";
    req.body.date = moment(req.body.date, 'DD-MM-YYYY').toISOString();
    req.body.time = moment(req.body.time, 'HH:mm').toISOString();
    const newAppointment = new Appointment(req.body);
    await newAppointment.save();
    // pushing notification to doctor based on his user id
    const user = await User.findOne({ _id: req.body.doctorInfo.userId });
    user.unseenNotification.push({
      type: "new-appointment-request",
      message: `A new appointment request has been made by ${req.body.userInfo.name}`,
      onClickPath: "/doctor/appointments",
    });
    await user.save();
    res.status(200).send({
      message: "Appointment booked succesfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating doctor account status:", error);
    res.status(500).send({
      message: "Error booking appointment",
      success: false,
      error,
    });
  }
});


router.get("/get-appointments-by-user-id", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({userId: req.body.userId});
    res.status(200).send({
      message: "Appointments fetched successfully",
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching Appointments:", error);
    res.status(500).send({
      message: "Error fetching doctors",
      success: false,
      error,
    });
  }
});


module.exports = router;
