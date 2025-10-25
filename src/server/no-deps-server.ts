// Minimal server with test endpoints
// In-memory storage for testing
const storage = new Map<string, any>();

export default {
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    
    // Test endpoint - simple ping
    if (url.pathname === "/api/ping") {
      return new Response(
        JSON.stringify({ 
          status: "ok", 
          message: "Server is connected!",
          timestamp: new Date().toISOString()
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Save data endpoint
    if (url.pathname === "/api/save" && request.method === "POST") {
      try {
        const body = await request.json();
        const key = body.key || `item_${Date.now()}`;
        const value = body.value;
        
        storage.set(key, {
          value,
          savedAt: new Date().toISOString()
        });
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Data saved successfully!",
            key,
            totalItems: storage.size
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: "Failed to save data",
            error: String(error)
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }
    
    // Get data endpoint
    if (url.pathname === "/api/get") {
      const key = url.searchParams.get("key");
      
      if (key && storage.has(key)) {
        return new Response(
          JSON.stringify({ 
            success: true,
            data: storage.get(key)
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Key not found"
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 404,
        }
      );
    }
    
    // List all data endpoint
    if (url.pathname === "/api/list") {
      const items = Array.from(storage.entries()).map(([key, data]) => ({
        key,
        ...data
      }));
      
      return new Response(
        JSON.stringify({ 
          success: true,
          count: items.length,
          items
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    return new Response("Not Found", { status: 404 });
  },
};
