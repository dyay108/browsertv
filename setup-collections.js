const PocketBase = require('pocketbase/cjs');

// PocketBase URL
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Admin credentials from environment variables
const adminEmail = process.env.ADMIN_EMAIL || 'dd@dd.com';
const adminPassword = process.env.ADMIN_PASSWORD || '1234567890';

// Initialize PocketBase client
const pb = new PocketBase(PB_URL);

// Collection definitions
const collections = [
  {
    name: "playlists",
    schema: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "lastUsed",
        type: "date",
        required: true
      },
      {
        name: "url", 
        type: "text",
        required: false
      },
      {
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false
        }
      }
    ]
  },
  {
    name: "channels",
    schema: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "url",
        type: "text", 
        required: true
      },
      {
        name: "logo",
        type: "text",
        required: false
      },
      {
        name: "group",
        type: "text",
        required: false
      },
      {
        name: "tvgId",
        type: "text",
        required: false
      },
      {
        name: "tvgName",
        type: "text",
        required: false
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      }
    ]
  },
  {
    name: "groups",
    schema: [
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      }
    ]
  },
  {
    name: "channel_groups",
    schema: [
      {
        name: "channel",
        type: "relation",
        required: true,
        options: {
          collectionId: "channels",
          cascadeDelete: true
        }
      },
      {
        name: "group",
        type: "relation",
        required: true,
        options: {
          collectionId: "groups",
          cascadeDelete: true
        }
      }
    ]
  },
  {
    name: "favorites",
    schema: [
      {
        name: "channel",
        type: "relation",
        required: true,
        options: {
          collectionId: "channels",
          cascadeDelete: true
        }
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      },
      {
        name: "user",
        type: "relation",
        required: true,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: true
        }
      }
    ]
  },
  {
    name: "group_order",
    schema: [
      {
        name: "groups",
        type: "json",
        required: true
      },
      {
        name: "playlist",
        type: "relation",
        required: true,
        options: {
          collectionId: "playlists",
          cascadeDelete: true
        }
      }
    ]
  }
];

// Main setup function
async function setupPocketBase() {
  try {
    console.log("Starting PocketBase setup...");
    console.log(`Using PocketBase URL: ${PB_URL}`);
    
    // Authenticate as admin
    console.log("Authenticating as admin...");
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log("Successfully authenticated as admin");
    } catch (error) {
      console.error("Authentication error:", error);
      throw new Error("Failed to authenticate. Please check your credentials.");
    }
    
    // Check existing collections to avoid duplicates
    console.log("Checking existing collections...");
    const existingCollections = await pb.collections.getFullList();
    const existingNames = existingCollections.map(c => c.name);
    
    // Create collections
    console.log("Creating collections...");
    
    for (const collection of collections) {
      if (existingNames.includes(collection.name)) {
        console.log(`Collection "${collection.name}" already exists, skipping.`);
        continue;
      }
      
      console.log(`Creating collection "${collection.name}"...`);
      
      try {
        await pb.collections.create({
          name: collection.name,
          type: "base",
          schema: collection.schema
        });
        
        console.log(`Collection "${collection.name}" created successfully.`);
      } catch (error) {
        console.error(`Error creating collection "${collection.name}":`, error);
      }
    }
    
    console.log("Setup completed successfully!");
  } catch (error) {
    console.error("Setup failed:", error);
    process.exit(1);
  }
}

// Wait 5 seconds and then run the setup
setTimeout(() => {
  setupPocketBase();
}, 5000);