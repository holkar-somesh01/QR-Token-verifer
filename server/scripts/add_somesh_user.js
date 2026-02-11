const { db } = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

async function addUser() {
    try {
        console.log('Connecting to database...');

        const userData = {
            studentId: 'SOMESH_01', // Generating a unique ID
            fullName: 'Somesh Holkar',
            email: 'someshwarsholkar2004@gmail.com',
            class: 'Computer Science',
            // mobile: null, 
            customFields: { addedBy: 'script' }
        };

        // Check if user exists
        const existing = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);

        if (existing.length > 0) {
            console.log(`User with email ${userData.email} already exists. Updating...`);
            await db.update(users).set(userData).where(eq(users.email, userData.email));
            console.log('User updated successfully.');
        } else {
            console.log('Inserting new user...');
            await db.insert(users).values(userData);
            console.log('User inserted successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding user:', error);
        process.exit(1);
    }
}

addUser();
