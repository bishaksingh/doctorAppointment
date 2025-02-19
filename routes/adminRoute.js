const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const authMiddleware = require("../middlewares/authMiddleware");

// Get all doctors
router.get("/get-all-doctors", authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find({});
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

// Get all users
router.get("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).send({
      message: "Users fetched successfully",
      success: true,
      data: users, // Corrected from `doctors` to `users`
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({
      message: "Error fetching users",
      success: false,
      error,
    });
  }
});

// Change doctor account status
router.post(
  "/change-doctor-account-status",
  authMiddleware,
  async (req, res) => {
    try {
      const { doctorId, status } = req.body;

      // Validate request body
      if (!doctorId || !status) {
        return res.status(400).send({
          message: "doctorId and status are required",
          success: false,
        });
      }

      const doctor = await Doctor.findByIdAndUpdate(doctorId, { status });
      if (!doctor) {
        return res.status(404).send({
          message: "Doctor not found",
          success: false,
        });
      }

      const user = await User.findById(doctor.userId);
      if (!user) {
        return res.status(404).send({
          message: "Associated user not found",
          success: false,
        });
      }

      // Add notification
      user.unseenNotification.push({
        type: "new-doctor-request-changed",
        message: `Your doctor account has been ${status}`,
        onClickPath: "/notification",
      });

      // Update user role
      user.isDoctor = status === "approved";

      await user.save();

      res.status(200).send({
        message: "Doctor status updated successfully",
        success: true,
        data: doctor,
      });
    } catch (error) {
      console.error("Error updating doctor account status:", error);
      res.status(500).send({
        message: "Error updating doctor account status",
        success: false,
        error,
      });
    }
  }
);


module.exports = router;
