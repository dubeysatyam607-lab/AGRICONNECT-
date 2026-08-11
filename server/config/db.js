const connectDB = async () => {
  console.log('Using local JSON mock database. No MongoDB connection required.');
  return Promise.resolve();
};

module.exports = connectDB;