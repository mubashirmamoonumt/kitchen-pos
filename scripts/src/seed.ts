import {
  db,
  usersTable,
  categoriesTable,
  menuItemsTable,
  customersTable,
  ordersTable,
  orderItemsTable,
  ingredientsTable,
  appSettingsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const ownerHash = await bcrypt.hash("owner123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  const [existingOwner] = await db
    .select()
    .from(usersTable)
    .where((t: typeof usersTable.$inferSelect) => true as unknown as typeof t);

  if ((existingOwner as unknown as unknown[])?.length === 0 || !existingOwner) {
    await db.insert(usersTable).values([
      { name: "Mufaz Owner", email: "owner@mufaz.com", passwordHash: ownerHash, role: "owner" },
      { name: "Staff Member", email: "staff@mufaz.com", passwordHash: staffHash, role: "staff" },
    ]).onConflictDoNothing();
  } else {
    await db.insert(usersTable).values([
      { name: "Mufaz Owner", email: "owner@mufaz.com", passwordHash: ownerHash, role: "owner" },
      { name: "Staff Member", email: "staff@mufaz.com", passwordHash: staffHash, role: "staff" },
    ]).onConflictDoNothing();
  }

  const cats = await db.insert(categoriesTable).values([
    { name: "Biryani", nameUr: "بریانی", sortOrder: 1 },
    { name: "Karahi", nameUr: "کڑاہی", sortOrder: 2 },
    { name: "Drinks", nameUr: "مشروبات", sortOrder: 3 },
    { name: "Desserts", nameUr: "میٹھا", sortOrder: 4 },
  ]).onConflictDoNothing().returning();

  if (cats.length > 0) {
    const [biryani, karahi, drinks, desserts] = cats;

    await db.insert(menuItemsTable).values([
      { categoryId: biryani.id, name: "Chicken Biryani", nameUr: "چکن بریانی", price: "350", isAvailable: true },
      { categoryId: biryani.id, name: "Mutton Biryani", nameUr: "مٹن بریانی", price: "550", isAvailable: true },
      { categoryId: karahi.id, name: "Chicken Karahi", nameUr: "چکن کڑاہی", price: "900", isAvailable: true },
      { categoryId: karahi.id, name: "Mutton Karahi", nameUr: "مٹن کڑاہی", price: "1400", isAvailable: true },
      { categoryId: drinks.id, name: "Lassi", nameUr: "لسی", price: "80", isAvailable: true },
      { categoryId: drinks.id, name: "Soft Drink", nameUr: "سافٹ ڈرنک", price: "60", isAvailable: true },
      { categoryId: desserts.id, name: "Kheer", nameUr: "کھیر", price: "120", isAvailable: true },
    ]).onConflictDoNothing();
  }

  await db.insert(customersTable).values([
    { name: "Ahmed Khan", phone: "0300-1234567", address: "Gulshan-e-Iqbal, Karachi" },
    { name: "Fatima Ali", phone: "0321-9876543", address: "Defence, Karachi" },
    { name: "Usman Raza", phone: "0333-5554444", address: "Clifton, Karachi" },
  ]).onConflictDoNothing();

  await db.insert(ingredientsTable).values([
    { name: "Rice", nameUr: "چاول", unit: "kg", stockQuantity: "20", lowStockThreshold: "5" },
    { name: "Chicken", nameUr: "مرغی", unit: "kg", stockQuantity: "15", lowStockThreshold: "3" },
    { name: "Mutton", nameUr: "گوشت", unit: "kg", stockQuantity: "10", lowStockThreshold: "2" },
    { name: "Cooking Oil", nameUr: "کھانے کا تیل", unit: "liter", stockQuantity: "8", lowStockThreshold: "2" },
    { name: "Tomatoes", nameUr: "ٹماٹر", unit: "kg", stockQuantity: "5", lowStockThreshold: "1" },
    { name: "Onions", nameUr: "پیاز", unit: "kg", stockQuantity: "6", lowStockThreshold: "1" },
    { name: "Garam Masala", nameUr: "گرم مسالہ", unit: "g", stockQuantity: "500", lowStockThreshold: "100" },
    { name: "Yogurt", nameUr: "دہی", unit: "kg", stockQuantity: "4", lowStockThreshold: "1" },
  ]).onConflictDoNothing();

  await db.insert(appSettingsTable).values([
    { key: "daily_order_capacity", value: "50" },
    { key: "kitchen_name", value: "MUFAZ Kitchen" },
    { key: "kitchen_phone", value: "0300-0000000" },
    { key: "kitchen_address", value: "Karachi, Pakistan" },
  ]).onConflictDoNothing();

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
