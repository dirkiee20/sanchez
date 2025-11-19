// Utility to check if we're running in Electron and handle IPC safely
export const isElectron = () => {
  return !!(window && window.process && window.process.type);
};

export const getIpcRenderer = () => {
  if (isElectron()) {
    return window.require('electron').ipcRenderer;
  }
  return null;
};

// Mock IPC for development mode
export const createMockIpc = () => {
  return {
    invoke: async (channel, ...args) => {
      console.log(`Mock IPC call: ${channel}`, args);
      
      // Mock responses for development
      switch (channel) {
        case 'db-login':
          if (args[0] === 'admin' && args[1] === 'admin123') {
            return {
              id: 1,
              username: 'admin',
              role: 'admin'
            };
          }
          throw new Error('Invalid username or password');
          
        case 'db-get-clients':
          const clients = [];
          const clientNames = [
            'ABC Construction', 'XYZ Builders', 'Metro Developers', 'City Infrastructure',
            'Highway Contractors', 'Bridge Engineering', 'Urban Planning Co', 'Steel Works Inc',
            'Concrete Solutions', 'Foundation Experts', 'Roofing Masters', 'Electrical Pro',
            'Plumbing Plus', 'HVAC Systems', 'Demolition Crew', 'Excavation Pros',
            'Landscaping Design', 'Paving Specialists', 'Utility Services', 'Green Building Co'
          ];
          const projectSites = [
            'Downtown Plaza', 'Industrial Park', 'Residential Complex', 'Commercial Tower',
            'Highway Project', 'Bridge Construction', 'Urban Renewal', 'Steel Factory',
            'Concrete Plant', 'Foundation Site', 'Roofing Project', 'Electrical Grid',
            'Plumbing Network', 'HVAC Installation', 'Demolition Zone', 'Excavation Area',
            'Landscape Garden', 'Paving Highway', 'Utility Expansion', 'Green Building'
          ];

          for (let i = 1; i <= 20; i++) {
            clients.push({
              id: i,
              name: clientNames[i - 1],
              contact_number: `+1 (555) ${String(100 + i).padStart(3, '0')}-${String(4000 + i).padStart(4, '0')}`,
              email: `${clientNames[i - 1].toLowerCase().replace(/\s+/g, '')}@example.com`,
              project_site: projectSites[i - 1],
              address: `${100 + i} ${['Main', 'Oak', 'Pine', 'Elm', 'Maple'][i % 5]} St, City, State ${10000 + i}`,
              created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            });
          }
          return clients;
          
                 case 'db-get-equipment':
           const equipment = [];
           const equipmentData = [
             { name: 'Excavator CAT 320', type: 'Heavy Machinery', rate: 450, desc: '20-ton excavator with bucket and hydraulic attachments' },
             { name: 'Crane 50T', type: 'Lifting Equipment', rate: 650, desc: '50-ton mobile crane with operator cab' },
             { name: 'Bulldozer D6T', type: 'Heavy Machinery', rate: 380, desc: 'Track-type tractor with blade and ripper' },
             { name: 'Concrete Mixer 3.5m³', type: 'Construction Equipment', rate: 120, desc: 'Portable concrete mixer with diesel engine' },
             { name: 'Generator 50kW', type: 'Power Equipment', rate: 80, desc: 'Diesel generator with automatic start' },
             { name: 'Forklift 5T', type: 'Material Handling', rate: 95, desc: '5-ton capacity forklift with extendable mast' },
             { name: 'Dump Truck 10T', type: 'Transportation', rate: 180, desc: '10-ton dump truck with hydraulic lift' },
             { name: 'Compactor Roller', type: 'Construction Equipment', rate: 140, desc: 'Vibratory road roller for asphalt compaction' },
             { name: 'Welding Machine', type: 'Power Equipment', rate: 60, desc: 'Portable arc welding machine with generator' },
             { name: 'Jackhammer', type: 'Construction Equipment', rate: 45, desc: 'Pneumatic jackhammer for concrete breaking' },
             { name: 'Scaffold Tower', type: 'Safety Equipment', rate: 35, desc: 'Adjustable scaffold tower system' },
             { name: 'Air Compressor', type: 'Power Equipment', rate: 70, desc: 'Portable air compressor with hose reel' },
             { name: 'Concrete Pump', type: 'Construction Equipment', rate: 200, desc: 'Truck-mounted concrete pump' },
             { name: 'Grader CAT 140', type: 'Heavy Machinery', rate: 320, desc: 'Motor grader for road leveling' },
             { name: 'Loader CAT 950', type: 'Heavy Machinery', rate: 280, desc: 'Wheel loader with bucket' },
             { name: 'Trench Digger', type: 'Construction Equipment', rate: 110, desc: 'Trenching machine for underground work' },
             { name: 'Portable Toilet', type: 'Facilities', rate: 25, desc: 'Portable restroom unit' },
             { name: 'Traffic Cones', type: 'Safety Equipment', rate: 15, desc: 'Set of 50 traffic safety cones' },
             { name: 'Cable Puller', type: 'Power Equipment', rate: 85, desc: 'Electric cable pulling machine' },
             { name: 'Pipe Threader', type: 'Construction Equipment', rate: 55, desc: 'Pipe threading machine' }
           ];

           const statuses = ['available', 'rented', 'maintenance'];

           for (let i = 1; i <= 20; i++) {
             const eq = equipmentData[i - 1] || equipmentData[0];
             equipment.push({
               id: i,
               name: eq.name,
               type: eq.type,
               rate_per_day: eq.rate,
               status: statuses[Math.floor(Math.random() * statuses.length)],
               description: eq.desc,
               quantity_total: Math.floor(Math.random() * 5) + 1,
               quantity_available: Math.floor(Math.random() * 3) + 1,
               created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
               updated_at: new Date().toISOString()
             });
           }
           return equipment;
          
                 case 'db-get-rentals':
           const rentals = [];
           const rentalStatuses = ['active', 'returned', 'overdue'];
           const paymentStatuses = ['paid', 'partial', 'unpaid'];

           for (let i = 1; i <= 20; i++) {
             const startDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
             const duration = Math.floor(Math.random() * 14) + 1; // 1-14 days
             const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
             const rate = Math.floor(Math.random() * 500) + 50;
             const quantity = Math.floor(Math.random() * 3) + 1;
             const totalAmount = rate * duration * quantity;

             rentals.push({
               id: i,
               client_id: Math.floor(Math.random() * 20) + 1,
               equipment_id: Math.floor(Math.random() * 20) + 1,
               client_name: `Client ${Math.floor(Math.random() * 20) + 1}`,
               equipment_name: `Equipment ${Math.floor(Math.random() * 20) + 1}`,
               equipment_type: ['Heavy Machinery', 'Construction Equipment', 'Lifting Equipment', 'Power Equipment'][Math.floor(Math.random() * 4)],
               start_date: startDate.toISOString().split('T')[0],
               end_date: endDate.toISOString().split('T')[0],
               rate_per_day: rate,
               total_amount: totalAmount,
               quantity: quantity,
               status: rentalStatuses[Math.floor(Math.random() * rentalStatuses.length)],
               payment_status: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
               total_paid: Math.random() > 0.3 ? totalAmount : Math.floor(Math.random() * totalAmount),
               created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
               updated_at: new Date().toISOString()
             });
           }
           return rentals;
           
         case 'db-get-available-equipment':
           return [
             {
               id: 4,
               name: 'Concrete Mixer 3.5m³',
               type: 'Construction Equipment',
               rate_per_day: 120.00,
               status: 'available',
               description: 'Portable concrete mixer with diesel engine'
             },
             {
               id: 5,
               name: 'Generator 50kW',
               type: 'Power Equipment',
               rate_per_day: 80.00,
               status: 'available',
               description: 'Diesel generator with automatic start'
             }
           ];
           
         case 'db-get-returns':
           return [
             {
               id: 1,
               rental_id: 1,
               client_name: 'ABC Construction',
               equipment_name: 'Excavator CAT 320',
               equipment_type: 'Heavy Machinery',
               return_date: '2024-01-25',
               condition: 'good',
               damage_description: null,
               additional_charges: 0.00,
               notes: 'Equipment returned in excellent condition',
               start_date: '2024-01-15',
               end_date: '2024-01-25',
               rate_per_day: 450.00,
               total_amount: 4500.00,
               created_at: new Date().toISOString()
             },
             {
               id: 2,
               rental_id: 2,
               client_name: 'XYZ Builders',
               equipment_name: 'Crane 50T',
               equipment_type: 'Lifting Equipment',
               return_date: '2024-01-22',
               condition: 'damaged',
               damage_description: 'Minor scratches on boom, hydraulic leak detected',
               additional_charges: 250.00,
               notes: 'Equipment returned with damage, repair charges applied',
               start_date: '2024-01-10',
               end_date: '2024-01-20',
               rate_per_day: 650.00,
               total_amount: 6500.00,
               created_at: new Date().toISOString()
             }
           ];
           
         case 'db-get-active-rentals':
           return [
             {
               id: 1,
               client_id: 1,
               equipment_id: 1,
               client_name: 'ABC Construction',
               equipment_name: 'Excavator CAT 320',
               equipment_type: 'Heavy Machinery',
               start_date: '2024-01-15',
               end_date: '2024-01-25',
               rate_per_day: 450.00,
               total_amount: 4500.00,
               status: 'active'
             },
             {
               id: 3,
               client_id: 1,
               equipment_id: 3,
               client_name: 'ABC Construction',
               equipment_name: 'Bulldozer D6T',
               equipment_type: 'Heavy Machinery',
               start_date: '2024-01-20',
               end_date: '2024-01-30',
               rate_per_day: 380.00,
               total_amount: 3800.00,
               status: 'active'
             }
           ];

         case 'db-get-recent-rentals':
           const limit = args[0] || 5;
           return [
             {
               id: 1,
               client_id: 1,
               equipment_id: 1,
               client_name: 'ABC Construction',
               equipment_name: 'Excavator CAT 320',
               equipment_type: 'Heavy Machinery',
               start_date: '2024-01-15',
               end_date: '2024-01-25',
               rate_per_day: 450.00,
               total_amount: 4500.00,
               status: 'active',
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString()
             },
             {
               id: 2,
               client_id: 2,
               equipment_id: 2,
               client_name: 'XYZ Builders',
               equipment_name: 'Crane 50T',
               equipment_type: 'Lifting Equipment',
               start_date: '2024-01-10',
               end_date: '2024-01-20',
               rate_per_day: 650.00,
               total_amount: 6500.00,
               status: 'overdue',
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString()
             }
           ].slice(0, limit);

         case 'db-get-payments-by-rental':
           return [
             {
               id: 1,
               rental_id: 1,
               amount: 2250.00,
               payment_type: 'partial',
               payment_date: '2024-01-20',
               notes: 'Partial payment for excavator rental'
             }
           ];

         case 'db-get-revenue-chart-data':
           // Generate mock data based on time period for testing
           const timePeriod = args[0] || 'monthly';
           const mockData = [];

           if (timePeriod === 'daily') {
             // Last 30 days of mock data
             for (let i = 29; i >= 0; i--) {
               const date = new Date();
               date.setDate(date.getDate() - i);
               const dateStr = date.toISOString().split('T')[0];
               const revenue = Math.floor(Math.random() * 5000) + 1000;
               const rentals = Math.floor(Math.random() * 10) + 1;
               mockData.push({
                 period: dateStr,
                 revenue: revenue,
                 rental_count: rentals
               });
             }
           } else if (timePeriod === 'weekly') {
             // Last 12 weeks of mock data
             for (let i = 11; i >= 0; i--) {
               const date = new Date();
               date.setDate(date.getDate() - (i * 7));
               const year = date.getFullYear();
               const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
               const weekStr = `${year}-${week.toString().padStart(2, '0')}`;
               const revenue = Math.floor(Math.random() * 15000) + 5000;
               const rentals = Math.floor(Math.random() * 25) + 5;
               mockData.push({
                 period: weekStr,
                 revenue: revenue,
                 rental_count: rentals
               });
             }
           } else if (timePeriod === 'yearly') {
             // Last 5 years of mock data
             for (let i = 4; i >= 0; i--) {
               const year = new Date().getFullYear() - i;
               const revenue = Math.floor(Math.random() * 200000) + 50000;
               const rentals = Math.floor(Math.random() * 200) + 50;
               mockData.push({
                 period: year.toString(),
                 revenue: revenue,
                 rental_count: rentals
               });
             }
           } else {
             // Monthly (default) - Last 12 months of mock data
             for (let i = 11; i >= 0; i--) {
               const date = new Date();
               date.setMonth(date.getMonth() - i);
               const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
               const revenue = Math.floor(Math.random() * 30000) + 8000;
               const rentals = Math.floor(Math.random() * 30) + 5;
               mockData.push({
                 period: monthStr,
                 revenue: revenue,
                 rental_count: rentals
               });
             }
           }

           return mockData;

         case 'db-get-equipment-chart-data':
           return [
             {
               equipment_type: 'Heavy Machinery',
               total_equipment: 8,
               currently_rented: 3,
               returned_count: 12
             },
             {
               equipment_type: 'Construction Equipment',
               total_equipment: 12,
               currently_rented: 2,
               returned_count: 18
             },
             {
               equipment_type: 'Lifting Equipment',
               total_equipment: 5,
               currently_rented: 1,
               returned_count: 7
             },
             {
               equipment_type: 'Power Equipment',
               total_equipment: 6,
               currently_rented: 0,
               returned_count: 9
             }
           ];

         case 'db-get-payment-status-chart-data':
           return [
             {
               payment_status: 'paid',
               count: 18,
               total_amount: 125000.00,
               avg_amount: 6944.44
             },
             {
               payment_status: 'partial',
               count: 7,
               total_amount: 45000.00,
               avg_amount: 6428.57
             },
             {
               payment_status: 'unpaid',
               count: 3,
               total_amount: 18500.00,
               avg_amount: 6166.67
             }
           ];
           
         case 'db-add-client':
         case 'db-add-equipment':
         case 'db-add-rental':
         case 'db-add-return':
           return { id: Date.now() };
           
         case 'db-update-client':
         case 'db-update-equipment':
         case 'db-update-rental':
         case 'db-update-return':
         case 'db-delete-client':
         case 'db-delete-equipment':
         case 'db-delete-rental':
         case 'db-delete-return':
           return { changes: 1 };
          
        default:
          throw new Error(`Unknown IPC channel: ${channel}`);
      }
    }
  };
};

export const getIpc = () => {
  const ipcRenderer = getIpcRenderer();
  if (ipcRenderer) {
    return ipcRenderer;
  }
  // In development, return mock IPC with event support
  return {
    invoke: async (channel, ...args) => {
      // Add a small delay to simulate database operations
      await new Promise(resolve => setTimeout(resolve, 100));
      return createMockIpc().invoke(channel, ...args);
    },
    on: (channel, callback) => {
      // Simulate database-ready event after delay
      if (channel === 'database-ready') {
        setTimeout(() => {
          console.log('Mock IPC: Emitting database-ready event');
          callback();
        }, 500);
      }
    },
    removeAllListeners: () => {
      // Mock implementation for cleanup
    }
  };
};

// Helper function to get electron API (for chart components)
export const getElectronAPI = () => {
  console.log('getElectronAPI: isElectron():', isElectron());
  console.log('getElectronAPI: window.electronAPI:', window.electronAPI);

  if (isElectron()) {
    if (window.electronAPI) {
      console.log('getElectronAPI: Returning window.electronAPI');
      return window.electronAPI;
    } else {
      // Fallback to ipcRenderer when window.electronAPI is not available
      console.log('getElectronAPI: window.electronAPI not available, using ipcRenderer fallback');
      const { ipcRenderer } = window.require('electron');
      return {
        invoke: async (channel, ...args) => {
          return await ipcRenderer.invoke(channel, ...args);
        }
      };
    }
  }

  // In development, return mock electronAPI
  console.log('getElectronAPI: Returning mock API');
  const mockApi = {
    invoke: async (channel, ...args) => {
      console.log('Mock API invoke called with channel:', channel);
      // Add a small delay to simulate database operations
      await new Promise(resolve => setTimeout(resolve, 100));
      return createMockIpc().invoke(channel, ...args);
    }
  };
  console.log('getElectronAPI: Created mock API:', mockApi);
  return mockApi;
};
