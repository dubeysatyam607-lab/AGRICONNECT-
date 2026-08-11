const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Simple JSON file-based database for development without needing MongoDB installed
const dataFile = path.join(__dirname, '../data/users.json');

const readData = () => {
  if (!fs.existsSync(dataFile)) {
    if (!fs.existsSync(path.dirname(dataFile))) {
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    }
    fs.writeFileSync(dataFile, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const writeData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

const wrapUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    save: async function() {
      const users = readData();
      const index = users.findIndex(u => u._id === this._id);
      
      // If password is changed and not hashed, hash it
      if (this.password && !this.password.startsWith('$2a$')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }

      if (index !== -1) {
        users[index] = { ...users[index], ...this };
        // Clean up any internal functions before saving
        const dataToSave = { ...users[index] };
        delete dataToSave.save;
        delete dataToSave.matchPassword;
        delete dataToSave.select;
        users[index] = dataToSave;
        writeData(users);
      }
    },
    matchPassword: async function(enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    },
    select: function(fields) {
      // Mock for .select('-password')
      if (fields === '-password') {
        const copy = { ...this };
        delete copy.password;
        return copy;
      }
      return this;
    }
  };
};

const User = {
  findOne: async (query) => {
    const users = readData();
    const user = users.find(u => {
      let match = true;
      for (const key in query) {
        if (u[key] !== query[key]) match = false;
      }
      return match;
    });
    return wrapUser(user);
  },
  findById: async (id) => {
    const users = readData();
    const user = users.find(u => u._id === id);
    return wrapUser(user);
  },
  create: async (userData) => {
    const users = readData();
    const newUser = {
      _id: Date.now().toString(),
      role: 'farmer',
      isVerified: false,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Hash password
    if (newUser.password) {
      const salt = await bcrypt.genSalt(10);
      newUser.password = await bcrypt.hash(newUser.password, salt);
    }
    
    users.push(newUser);
    writeData(users);
    
    return wrapUser(newUser);
  }
};

module.exports = User;
