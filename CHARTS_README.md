# Charts Documentation

## Overview
This document describes the chart components used in the Rent and Return System dashboard. The system includes three main chart types: Revenue Trend, Equipment Utilization, and Payment Status Distribution.

## Chart Components

### 1. RevenueChart (`src/components/RevenueChart.js`)

**Purpose**: Displays revenue trends over different time periods.

**Features**:
- Time period selection (Daily, Weekly, Monthly, Yearly)
- Dual-axis chart showing both revenue ($) and rental count
- Interactive tooltips with detailed information
- Responsive design with proper scaling

**Data Source**:
- **Production**: Queries `rentals` table using `created_at` timestamp
- **Development**: Uses mock data with randomized values for testing

**Time Periods**:
- **Daily**: Last 30 days, grouped by date (`%Y-%m-%d`)
- **Weekly**: Last 12 weeks, grouped by year-week (`%Y-%u`)
- **Monthly**: Last 12 months, grouped by year-month (`%Y-%m`) - Default
- **Yearly**: Last 5 years, grouped by year (`%Y`)

**Chart Properties**:
- **Type**: Line chart with area fill
- **X-axis**: Time periods (dates/weeks/months/years)
- **Y-axis (Left)**: Revenue in dollars
- **Y-axis (Right)**: Number of rentals
- **Height**: 384px (h-96) for larger charts, 256px (h-64) for smaller

### 2. EquipmentChart (`src/components/EquipmentChart.js`)

**Purpose**: Shows equipment utilization statistics by type.

**Features**:
- Bar chart displaying equipment counts by category
- Three data series: Total Equipment, Currently Rented, Total Rentals
- Color-coded bars for easy identification

**Data Source**:
- Queries `equipment` and `rentals` tables
- Joins equipment with rental history

**Chart Properties**:
- **Type**: Multi-series bar chart
- **X-axis**: Equipment types
- **Y-axis**: Count values
- **Height**: 320px (h-80)
- **Colors**:
  - Total Equipment: Blue
  - Currently Rented: Red
  - Total Rentals: Green

### 3. PaymentChart (`src/components/PaymentChart.js`)

**Purpose**: Displays payment status distribution across all rentals.

**Features**:
- Doughnut chart showing payment status breakdown
- Summary statistics displayed above the chart
- Interactive tooltips with detailed payment information

**Data Source**:
- Queries `rentals` table for payment status counts
- Groups by `payment_status` (paid, partial, unpaid)

**Chart Properties**:
- **Type**: Doughnut chart
- **Data**: Payment status distribution
- **Height**: 320px (h-80)
- **Colors**:
  - Paid: Green
  - Partial: Orange
  - Unpaid: Red
- **Cutout**: 60% (doughnut hole)

## Technical Implementation

### IPC Communication
All charts communicate with the main Electron process using IPC (Inter-Process Communication):

```javascript
// Frontend (React)
const electronAPI = getElectronAPI();
const data = await electronAPI.invoke('db-get-revenue-chart-data', timePeriod);

// Backend (Electron)
ipcMain.handle('db-get-revenue-chart-data', async (event, timePeriod) => {
  // Database query logic
});
```

### Chart.js Integration
- Uses Chart.js v4.x with React wrapper
- Registers necessary components for each chart type
- Implements responsive design and proper scaling

### Error Handling
- Charts display loading spinners during data fetch
- Show "No data available" message when no data is returned
- Console logging for debugging data flow

### Development vs Production
- **Development**: Uses mock data from `electronUtils.js`
- **Production**: Queries actual database through Electron main process

## Dashboard Layout

### Grid System
```html
<!-- Charts Section -->
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
  <div className="xl:col-span-2">
    <RevenueChart /> {/* Full width */}
  </div>
  <EquipmentChart /> {/* Half width */}
  <PaymentChart /> {/* Half width */}
</div>
```

### Responsive Breakpoints
- **Mobile (< 1280px)**: Single column layout
- **Desktop (≥ 1280px)**: Two-column layout with revenue chart spanning full width

## Data Flow

1. **Component Mount**: Chart component initializes and calls data fetch
2. **IPC Call**: Frontend sends request to Electron main process
3. **Database Query**: Main process executes SQL query
4. **Data Processing**: Results are formatted and returned
5. **Chart Rendering**: Frontend receives data and renders Chart.js visualization
6. **User Interaction**: Time period changes trigger re-fetch and re-render

## Dependencies

### Frontend
- `react-chartjs-2`: React wrapper for Chart.js
- `chart.js`: Core charting library
- `lucide-react`: Icons (not directly used in charts)

### Backend
- `mysql2/promise`: Database connectivity
- `electron`: IPC communication

## Styling

### CSS Classes Used
- `bg-white`: White background
- `p-6`: Padding
- `rounded-lg`: Border radius
- `shadow-md`: Drop shadow
- `h-64`, `h-80`, `h-96`: Height variations

### Tailwind Configuration
Charts use Tailwind CSS utility classes for consistent styling with the rest of the application.

## Future Enhancements

### Potential Improvements
1. **Real-time Updates**: WebSocket integration for live data
2. **Export Functionality**: PDF/CSV export of chart data
3. **Advanced Filtering**: Date range selection, equipment type filtering
4. **Animation**: Smooth transitions between data updates
5. **Accessibility**: ARIA labels and keyboard navigation

### Additional Chart Types
1. **Client Revenue**: Revenue by client
2. **Equipment Performance**: Utilization rates over time
3. **Geographic Distribution**: Revenue by project site location
4. **Seasonal Trends**: Revenue patterns by month/quarter

## Troubleshooting

### Common Issues
1. **Charts not loading**: Check IPC communication and database connectivity
2. **Empty charts**: Verify data exists in database for selected time period
3. **Performance issues**: Large datasets may need pagination or sampling
4. **Styling issues**: Ensure Chart.js plugins are properly registered

### Debug Information
- Frontend logs data received from backend
- Backend logs query execution and results
- Chart.js warnings appear in browser console

## File Structure
```
src/
├── components/
│   ├── RevenueChart.js      # Revenue trend chart
│   ├── EquipmentChart.js    # Equipment utilization chart
│   ├── PaymentChart.js      # Payment status chart
│   └── Dashboard.js         # Main dashboard layout
├── utils/
│   └── electronUtils.js     # IPC utilities and mock data
└── services/
    └── (various service files)