import Dexie from "dexie";

// Create IndexedDB database
class LibraryDB extends Dexie {
  constructor() {
    super("LibraryDB");
    
    // Define database schema
    this.version(1).stores({
      libraries: "++id, _id, managerId, name, capacity, location, quote, createdAt, lastSynced",
      seats: "++id, _id, libraryId, seatNumber, lastSynced",
      students: "++id, _id, libraryId, seatNumber, shiftName, name, rollNo, email, contact, createdAt, lastSynced",
      pendingOperations: "++id, type, endpoint, method, data, timestamp, retries, status",
      syncQueue: "++id, operation, data, timestamp, retries"
    });
  }
}

// Create database instance
export const db = new LibraryDB();

// Helper functions for database operations
export const dbService = {
  // Library operations
  async saveLibrary(library) {
    try {
      await db.libraries.put({
        ...library,
        lastSynced: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving library:", error);
      throw error;
    }
  },

  async getLibrary(managerId) {
    try {
      // Convert managerId to string for comparison
      const managerIdStr = String(managerId);
      const libraries = await db.libraries.toArray();
      const library = libraries.find(lib => String(lib.managerId) === managerIdStr);
      return library || null;
    } catch (error) {
      console.error("Error getting library:", error);
      return null;
    }
  },

  // Seat operations
  async saveSeats(seats) {
    try {
      if (!Array.isArray(seats)) return;
      
      const seatsWithSync = seats.map(seat => ({
        ...seat,
        lastSynced: new Date().toISOString(),
      }));
      
      await db.seats.bulkPut(seatsWithSync);
    } catch (error) {
      console.error("Error saving seats:", error);
      throw error;
    }
  },

  async getSeats(libraryId) {
    try {
      const seats = await db.seats
        .where("libraryId")
        .equals(libraryId)
        .sortBy("seatNumber");
      return seats;
    } catch (error) {
      console.error("Error getting seats:", error);
      return [];
    }
  },

  async updateSeat(seat) {
    try {
      await db.seats.put({
        ...seat,
        lastSynced: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating seat:", error);
      throw error;
    }
  },

  // Student operations
  async saveStudent(student) {
    try {
      await db.students.put({
        ...student,
        lastSynced: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving student:", error);
      throw error;
    }
  },

  async deleteStudent(studentId) {
    try {
      await db.students.delete(studentId);
    } catch (error) {
      console.error("Error deleting student:", error);
      throw error;
    }
  },

  // Pending operations queue
  async addPendingOperation(operation) {
    try {
      await db.pendingOperations.add({
        ...operation,
        timestamp: new Date().toISOString(),
        retries: 0,
        status: "pending",
      });
    } catch (error) {
      console.error("Error adding pending operation:", error);
      throw error;
    }
  },

  async getPendingOperations() {
    try {
      return await db.pendingOperations
        .where("status")
        .equals("pending")
        .toArray();
    } catch (error) {
      console.error("Error getting pending operations:", error);
      return [];
    }
  },

  async markOperationComplete(operationId) {
    try {
      await db.pendingOperations.update(operationId, {
        status: "completed",
      });
    } catch (error) {
      console.error("Error marking operation complete:", error);
    }
  },

  async markOperationFailed(operationId, retries) {
    try {
      await db.pendingOperations.update(operationId, {
        status: retries >= 3 ? "failed" : "pending",
        retries: retries + 1,
      });
    } catch (error) {
      console.error("Error marking operation failed:", error);
    }
  },

  async deleteOperation(operationId) {
    try {
      await db.pendingOperations.delete(operationId);
    } catch (error) {
      console.error("Error deleting operation:", error);
    }
  },

  // Clear all data (for logout)
  async clearAll() {
    try {
      await db.libraries.clear();
      await db.seats.clear();
      await db.students.clear();
      await db.pendingOperations.clear();
      await db.syncQueue.clear();
    } catch (error) {
      console.error("Error clearing database:", error);
    }
  },
};

export default dbService;

