const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');



const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect('mongodb://0.0.0.0:27017/doctor_app', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(error => console.error('Failed to connect to MongoDB', error));
// Connect to MongoDB
// mongoose.connect('mongodb://localhost/doctor_app', { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function() {
//     console.log("Connected to MongoDB");
// });



// Define the patient schema
const patientSchema = new mongoose.Schema({
  name: String
});

// Define the doctor schema
const doctorSchema = new mongoose.Schema({
    name: String,
    specialization: String
  });
  
  // Define the doctor model
  const Doctor = mongoose.model('Doctor', doctorSchema);

  
// Define the payment schema
const paymentSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  amount: Number,
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending'
  }
});

// Define the prescription schema
const prescriptionSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },

  medication: String,
  dosage: String,
  instructions: String
});
  

// Define the appointment schema
const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  doctor:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  date: Date,
  time: String,  // Add the time field
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected','Visited', 'Not Visited'],
    default: 'Pending'
  }

});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  usertype: String,
});

const User = mongoose.model('User', userSchema);

// Define the patient model
const Patient = mongoose.model('Patient', patientSchema);

// Define the appointment model
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Prescription = mongoose.model('Prescription', prescriptionSchema);

// Mark an appointment as visited
app.put('/api/appointments/:id/visited', async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, { status: 'Visited' }, { new: true });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark the appointment as visited' });
  }
});

// Mark an appointment as not visited
app.put('/api/appointments/:id/notvisited', async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, { status: 'Visited' }, { new: true });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark the appointment as not visited' });
  }
});


app.put('/api/appointments/:id/approve', async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, { status: 'Approved' }, { new: true });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve the appointment' });
  }
});
app.put('/api/appointments/:id/reject', async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const appointment = await Appointment.findByIdAndUpdate(appointmentId, { status: 'Rejected' }, { new: true });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject the appointment' });
  }
});


// create a user in the database
// app.post('/register', async(req, res) => {
//   const { username, password, usertype } = req.body;
//   // Hash password before storing in database
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const usersCollection = db.collection('users');
//   usersCollection.insertOne({ username, password: hashedPassword, usertype }, (err, result) => {
//       if (err) {
//           console.error('Error creating user:', err);
//           res.status(500).json({ message: 'Server error' });
//       } else {
//           const user = {
//               id: result.insertedId,
//               username,
//               password: hashedPassword,
//               usertype,
//           };
//           const token = jwt.sign({ userId: user.id }, 'secret_key');
//           res.cookie('token', token, { httpOnly: true });
//           res.json(user);
//       }
//   });
// });
// app.post('/register', async (req, res) => {
//   const { username, password, usertype } = req.body;
//   // Hash password before storing in the database
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const usersCollection = db.collection('users');
//   usersCollection.insertOne(
//     { username, password: hashedPassword, usertype },
//     (err, result) => {
//       if (err) {
//         console.error('Error creating user:', err);
//         res.status(500).json({ message: 'Server error' });
//       } else {
//         const user = {
//           id: result.insertedId,
//           username,
//           password: hashedPassword,
//           usertype,
//         };
//         const token = jwt.sign({ userId: user.id }, 'secret_key');
//         // Send the token in the response body
//         res.json({ token });
//       }
//     }
//   );
// });
app.post('/register', async (req, res) => {
  const { username, password, usertype } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = new User({ username, password: hashedPassword, usertype });
    await user.save();

    if (usertype === 'patient') {
      const patient = new Patient({ name: username }); // Assuming the username is the patient's name
      await patient.save();
    }

    const token = jwt.sign({ userId: user._id }, 'secret_key');
    res.json({ token });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// axios.post('/login', { username: 'Admin', password: 'admin' })
//   .then(response => {
//     const token = response.data.token;
//     // Include the token in the request headers for subsequent requests
//     axios.get('/protected-route', {
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     })
//       .then(response => {
//         // Handle the response
//       })
//       .catch(error => {
//         // Handle the error
//       });
//   })
//   .catch(error => {
//     // Handle the error
//   });



// define routes
// app.post('/login', async(req, res) => {
//   const { username, password, usertype } = req.body;
//   const usersCollection = db.collection('users');
//   const user = await usersCollection.findOne({ username, usertype });

//   if (!user) {
//       console.log(username);
//       console.log(usertype);
//       console.log(password);
//       return res.status(401).json({ message: 'Invalid credentials' });
//   }

//   const isPasswordValid = await bcrypt.compare(password, user.password);
//   if (!isPasswordValid) {
//       console.log(password);
//       console.log(user.password);
//       return res.status(401).json({ message: 'Invalid credentials password' });
//   }

//   const token = jwt.sign({ userId: user._id }, 'secret_key');
//   res.cookie('token', token, { httpOnly: true });
//   res.json({ user });
// });
app.post('/login', async (req, res) => {
  const { username, password, usertype } = req.body;

  try {
    const user = await User.findOne({ username, usertype });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, 'secret_key');
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Make a payment
app.post('/api/payments', async (req, res) => {
  const { appointmentId, amount } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const payment = new Payment({ appointment: appointmentId, amount });
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to make a payment' });
  }
});


// Get prescriptions by appointment ID
app.get('/api/prescriptions/appointment/:id', async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const prescriptions = await Prescription.find({ appointment: appointmentId }).populate('appointment','patient');
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get prescriptions' });
  }
});


// Create a prescription
app.post('/api/prescriptions', async (req, res) => {
  const { appointmentId, medication, dosage, instructions } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const prescription = new Prescription({ appointment: appointmentId, medication, dosage, instructions });
    await prescription.save();
    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create a prescription' });
  }
});

// Get all payments
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await Payment.find().populate('appointment');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// Get all prescriptions
app.get('/api/prescriptions', async (req, res) => {
  try {
    const prescriptions = await Prescription.find().populate('appointment');
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get prescriptions' });
  }
});

// Get a prescription by ID
app.get('/api/prescriptions/:id', async (req, res) => {
  const prescriptionId = req.params.id;

  try {
    const prescription = await Prescription.findById(prescriptionId).populate('appointment');
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get prescription' });
  }
});

  // Add a new doctor
  // app.post('/api/doctors', async (req, res) => {
  //   const { name, specialization } = req.body;
  //   const doctor = new Doctor({ name, specialization });
  
  //   try {
  //     await doctor.save();
  //     res.status(201).json(doctor);
  //   } catch (error) {
  //     res.status(500).json({ error: 'Failed to create a doctor' });
  //   }
  // });
  // Add a new doctor
// app.post('/api/doctors', async (req, res) => {
//   const { name, specialization, username, password } = req.body;

//   // Check if the user making the request is an admin
//   const token = req.headers.authorization;
//   const decodedToken = jwt.verify(token, 'secret_key');
//   const userId = decodedToken.userId;
//   const user = await User.findById(userId);
//   if (!user || user.usertype !== 'admin') {
//     return res.status(401).json({ error: 'Only admin can register a doctor' });
//   }

//   // Create a new user for the doctor
//   const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = new User({ username, password: hashedPassword, usertype: 'doctor' });

//   try {
//     // Save the new user
//     await newUser.save();

//     // Create the doctor with the provided information
//     const doctor = new Doctor({ name, specialization, user: newUser._id });
//     await doctor.save();

//     res.status(201).json(doctor);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create a doctor' });
//   }
// });
app.post('/api/doctors', async (req, res) => {
  const { name, specialization, username, password } = req.body;

  // Check if the user making the request is an admin
  // const token = req.headers.authorization;
  // const decodedToken = jwt.verify(token, 'secret_key');
  // const userId = decodedToken.userId;
  // const user = await User.findById(userId);
  // if (!user || user.usertype !== 'admin') {
  //   return res.status(401).json({ error: 'Only admin can register a doctor' });
  // }

  try {
    // Create a new user for the doctor
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, usertype: 'doctor' });
    await newUser.save();

    // Create the doctor with the provided information
    const doctor = new Doctor({ name, specialization, user: newUser._id });
    await doctor.save();

    res.status(201).json(doctor);
  } catch (error) {
    console.error('Failed to create a doctor:', error);
    res.status(500).json({ error: 'Failed to create a doctor' });
  }
});


  // Get all doctors
app.get('/doctors', async (req, res) => {
    try {
      const doctors = await Doctor.find();
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get doctors' });
    }
  });

// Get all patients
app.get('/api/patients', async (req, res) => {
    try {
      const patients = await Patient.find();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get patients' });
    }
  });
  

// Add a new patient
app.post('/api/patients', async (req, res) => {
  const { name } = req.body;
  const patient = new Patient({ name });

  try {
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create a patient' });
  }
});

app.get('/api/patients/:id', (req, res) => {
  const loggedInPatientId = req.patientId;

  // Retrieve the patient's information using the logged-in patient's ID
  Patient.findById(loggedInPatientId)
    .then(patient => {
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Return the patient's information
      res.status(200).json(patient);
    })
    .catch(error => {
      console.error('Failed to get patient', error);
      res.status(500).json({ error: 'Failed to get patient' });
    });
});


// Schedule an appointment
app.post('/api/appointments', async (req, res) => {
  
  const { patientId, doctorId, date, time } = req.body;  // Add time field

  try {
    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const existingAppointment = await Appointment.findOne({ doctor: doctorId, date, time });  // Check for existing appointment with date and time
    if (existingAppointment) {
      return res.status(400).json({ error: 'Doctor already has an appointment at this date and time' });
    }

    const appointment = new Appointment({ patient: patientId, doctor: doctorId, date, time });  // Include time in the appointment
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create an appointment' });
  }
});




// Get appointments by date
app.get('/api/appointments', async (req, res) => {
  const { date } = req.query;

  try {
    const appointments = await Appointment.find({ date }).populate('patient','doctor');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

// Get all appointments
app.get('/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find().populate('patient').populate('doctor').populate('time');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});
// app.get('/appointments', async (req, res) => {
//   // Get the logged-in doctor's ID from the request headers or wherever it is stored
//   // const loggedInDoctorId = '...'; // Replace with the actual way of getting the doctor's ID

//   try {
//     const appointments = await Appointment.find({ doctor: doctorId })
//       .populate('patient')
//       .populate('doctor')
//       .populate('time');
      
//     // Filter appointments to include only appointments with the logged-in doctor
//     const filteredAppointments = appointments.filter(appointment => appointment.doctor._id.toString() === doctorId);
    
//     res.json(filteredAppointments);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to get appointments' });
//   }
// });


  

// Start the server
const port = 3000;
app.listen(port, () => console.log(`Server started on port ${port}`));
