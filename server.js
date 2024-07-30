const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/eLearningPlatform', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String, // student or instructor
});
const User = mongoose.model('User', userSchema);

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const Course = mongoose.model('Course', courseSchema);

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, role });
  await user.save();
  res.status(201).send('User registered');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(400).send('Invalid credentials');
  }
  const token = jwt.sign({ userId: user._id, role: user.role }, 'secretKey');
  res.send({ token });
});

app.post('/course', async (req, res) => {
  const { token, title, description } = req.body;
  const payload = jwt.verify(token, 'secretKey');
  const user = await User.findById(payload.userId);
  if (!user || user.role !== 'instructor') {
    return res.status(403).send('Access denied');
  }
  const course = new Course({ title, description, instructor: user._id });
  await course.save();
  res.send('Course created');
});

app.post('/enroll', async (req, res) => {
  const { token, courseId } = req.body;
  const payload = jwt.verify(token, 'secretKey');
  const user = await User.findById(payload.userId);
  if (!user || user.role !== 'student') {
    return res.status(403).send('Access denied');
  }
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).send('Course not found');
  }
  course.students.push(user._id);
  await course.save();
  res.send('Enrolled in course');
});

app.get('/courses', async (req, res) => {
  const courses = await Course.find().populate('instructor', 'username').populate('students', 'username');
  res.send(courses);
});

app.listen(3000, () => console.log('Server started on port 3000'));
