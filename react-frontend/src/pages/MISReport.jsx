import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Button, CircularProgress, Tabs, Tab, TextField, Stack, Grid, Paper } from '@mui/material';
import { DataGrid, GridToolbarContainer, GridToolbarExport, GridToolbarFilterButton } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarExport printOptions={{ disableToolbarButton: true }} />
      <GridToolbarFilterButton />
    </GridToolbarContainer>
  );
}

const MISReport = () => {
  const [materials, setMaterials] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const locationId = useAuthStore(state => state.selectedLocation?.id);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(
      new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0] // Default 1 month ago
  );
  const [endDate, setEndDate] = useState(todayStr);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, stockRes] = await Promise.all([
        api.get(`/api/v1/materials?locationId=${locationId}`),
        api.get(`/api/v1/stock-entries?locationId=${locationId}`)
      ]);
      setMaterials(matRes.data);
      setEntries(stockRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const setPresetDate = (months) => {
      const start = new Date();
      start.setMonth(start.getMonth() - months);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(todayStr);
  };

  // Process data for the Closing Report based on startDate and endDate
  const reportData = useMemo(() => {
      if (!materials.length || !entries.length) return [];
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const aggregatedData = {};

      materials.forEach(mat => {
          const matEntries = entries.filter(e => e.material?.id === mat.id);
          
          let openingArrivalGroups = {};
          let inwardGroups = {};
          let openingOut = 0;
          let issuedRange = 0;

          matEntries.forEach(e => {
             const bill = (e.billNumber || '').trim();
             const arrDate = e.arrivalDate || 'nodate';
             const arrTime = e.arrivalTime || 'notime';
             const brought = e.broughtBy || 'nobroughtby';
             const key = bill !== '' ? bill : `${arrDate}_${arrTime}_${brought}`;
             const arrQty = parseFloat(e.arrivalQuantity || 0);
             const outQty = parseFloat(e.outgoingQuantity || 0);
             
             const arrDateObj = e.arrivalDate ? new Date(e.arrivalDate) : new Date(0);
             const issDateObj = e.issueDate ? new Date(e.issueDate) : (e.arrivalDate ? new Date(e.arrivalDate) : new Date(0));

             // Opening Stock Logic (Before Start Date)
             if (arrDateObj < start) {
                 if (!openingArrivalGroups[key] || arrQty > openingArrivalGroups[key]) {
                     openingArrivalGroups[key] = arrQty;
                 }
             } else if (arrDateObj >= start && arrDateObj <= end) {
                 // Inward Logic (During Range)
                 if (!inwardGroups[key] || arrQty > inwardGroups[key]) {
                     inwardGroups[key] = arrQty;
                 }
             }
             
             if (issDateObj < start) {
                 openingOut += outQty;
             } else if (issDateObj >= start && issDateObj <= end) {
                 issuedRange += outQty;
             }
          });

          let openingArr = 0;
          Object.values(openingArrivalGroups).forEach(val => openingArr += val);
          
          let inwardRange = 0;
          Object.values(inwardGroups).forEach(val => inwardRange += val);

          const openingStock = openingArr - openingOut;
          const closingStock = openingStock + inwardRange - issuedRange;

          if (aggregatedData[mat.materialCode]) {
              aggregatedData[mat.materialCode].openingStock += openingStock;
              aggregatedData[mat.materialCode].inward += inwardRange;
              aggregatedData[mat.materialCode].issued += issuedRange;
              aggregatedData[mat.materialCode].closingStock += closingStock;
          } else {
              aggregatedData[mat.materialCode] = {
                  id: mat.materialCode, // use code as unique id
                  materialCode: mat.materialCode,
                  materialName: mat.name,
                  category: mat.category || 'Unknown',
                  openingStock,
                  inward: inwardRange,
                  issued: issuedRange,
                  closingStock
              };
          }
      });
      return Object.values(aggregatedData);
  }, [materials, entries, startDate, endDate]);

  // Data for Charts
  const chartData = useMemo(() => {
      // Top 5 Issued Materials
      const topIssued = [...reportData].sort((a, b) => b.issued - a.issued).slice(0, 5);
      
      // Category Distribution of Closing Stock
      const categoryMap = {};
      reportData.forEach(r => {
          if (r.closingStock > 0) {
              categoryMap[r.category] = (categoryMap[r.category] || 0) + r.closingStock;
          }
      });
      const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));

      return { topIssued, categoryData };
  }, [reportData]);

  // Entry Book Filtered Data
  const filteredEntries = useMemo(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      return entries.filter(e => {
          const arrDate = e.arrivalDate ? new Date(e.arrivalDate) : null;
          const issDate = e.issueDate ? new Date(e.issueDate) : null;
          
          const arrInRange = arrDate && arrDate >= start && arrDate <= end;
          const issInRange = issDate && issDate >= start && issDate <= end;
          
          return arrInRange || issInRange;
      }).map(r => ({
          ...r,
          materialName: r.material?.name,
          materialCode: r.material?.materialCode
      }));
  }, [entries, startDate, endDate]);


  const reportColumns = [
    { field: 'materialCode', headerName: 'Item Code', width: 130 },
    { field: 'materialName', headerName: 'Item Name', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'openingStock', headerName: 'Opening Stock', width: 150, type: 'number' },
    { field: 'inward', headerName: 'Inward (+)', width: 150, type: 'number' },
    { field: 'issued', headerName: 'Issued (-)', width: 150, type: 'number' },
    { field: 'closingStock', headerName: 'Closing Stock (=)', width: 150, type: 'number',
      renderCell: (params) => (
        <Typography fontWeight="bold" color={params.value < 0 ? 'error' : 'success.main'}>
          {params.value}
        </Typography>
      )
    },
  ];

  const entryColumns = [
    { field: 'billNumber', headerName: 'Bill number', width: 130 },
    { field: 'materialCode', headerName: 'Item Code', width: 130 },
    { field: 'materialName', headerName: 'Item Name', flex: 1, minWidth: 150 },
    { field: 'arrivalQuantity', headerName: 'Arrival Qty', type: 'number', width: 110 },
    { field: 'arrivalDate', headerName: 'Store Arrival Date', width: 150 },
    { field: 'outgoingQuantity', headerName: 'Outgoing Qty', type: 'number', width: 120 },
    { field: 'issueDate', headerName: 'Issue Date', width: 150 },
    { field: 'issuedBy', headerName: 'Issued By', width: 130 },
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', lg: 'center' }, mb: 2, gap: 2, px: { xs: 2, sm: 0 } }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          MIS Dashboard
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
           <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
             <Button variant="outlined" size="small" onClick={() => setPresetDate(1)}>1 Mo</Button>
             <Button variant="outlined" size="small" onClick={() => setPresetDate(6)}>6 Mo</Button>
             <Button variant="outlined" size="small" onClick={() => setPresetDate(12)}>1 Yr</Button>
           </Stack>
           
           <Stack direction="row" spacing={1} alignItems="center">
             <TextField 
               label="Start Date" 
               type="date" 
               value={startDate} 
               onChange={e => setStartDate(e.target.value)} 
               size="small" 
               InputLabelProps={{ shrink: true }} 
               sx={{ width: 140 }}
             />
             <Typography variant="body2">to</Typography>
             <TextField 
               label="End Date" 
               type="date" 
               value={endDate} 
               onChange={e => setEndDate(e.target.value)} 
               size="small" 
               InputLabelProps={{ shrink: true }} 
               sx={{ width: 140 }}
             />
           </Stack>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, px: { xs: 2, sm: 0 } }}>
        <Tabs value={tabValue} onChange={handleTabChange} textColor="primary" indicatorColor="primary" variant="scrollable" scrollButtons="auto">
          <Tab label="Closing Stock & Analytics" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
          <Tab label="Transaction Log" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}><CircularProgress /></Box>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', px: { xs: 2, sm: 0 }, pb: 2, minHeight: 0 }}>
          {tabValue === 0 && (
             <Grid container spacing={3}>
                <Grid item xs={12} md={12}>
                   <Card elevation={2}>
                      <CardContent>
                         <Typography variant="h6" gutterBottom color="textSecondary">Stock Movement (Opening vs Closing)</Typography>
                         <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={reportData.filter(r => r.openingStock > 0 || r.closingStock > 0 || r.inward > 0 || r.issued > 0)}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} />
                               <XAxis dataKey="materialName" />
                               <YAxis />
                               <ChartTooltip cursor={{fill: '#f5f5f5'}} />
                               <Legend />
                               <Bar dataKey="openingStock" fill="#8884d8" name="Opening Stock" radius={[4, 4, 0, 0]} />
                               <Bar dataKey="closingStock" fill="#82ca9d" name="Closing Stock" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                   <Card elevation={2}>
                      <CardContent>
                         <Typography variant="h6" gutterBottom color="textSecondary">Top 5 Issued Materials</Typography>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.topIssued}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} />
                               <XAxis dataKey="materialName" />
                               <YAxis />
                               <ChartTooltip cursor={{fill: 'transparent'}} />
                               <Legend />
                               <Bar dataKey="issued" fill="#0088FE" name="Issued Quantity" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                   <Card elevation={2}>
                      <CardContent>
                         <Typography variant="h6" gutterBottom color="textSecondary">Closing Stock by Category</Typography>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                               <Pie data={chartData.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                  {chartData.categoryData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                               </Pie>
                               <ChartTooltip />
                               <Legend />
                            </PieChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>
                </Grid>
                <Grid item xs={12} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
                   <Paper sx={{ width: '100%', mt: 2, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} elevation={2}>
                      <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                         <DataGrid
                           rows={reportData}
                           columns={reportColumns}
                           density="comfortable"
                           slots={{ toolbar: CustomToolbar }}
                           initialState={{
                              pagination: { paginationModel: { page: 0, pageSize: 25 } },
                              sorting: { sortModel: [{ field: 'closingStock', sort: 'desc' }] }
                           }}
                           pageSizeOptions={[10, 25, 50, 100]}
                           disableRowSelectionOnClick
                           sx={{ border: 'none' }}
                         />
                      </Box>
                   </Paper>
                </Grid>
             </Grid>
          )}

          {tabValue === 1 && (
             <Paper sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 400 }} elevation={2}>
                <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                   <DataGrid
                     rows={filteredEntries}
                     columns={entryColumns}
                     density="comfortable"
                     slots={{ toolbar: CustomToolbar }}
                     initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 25 } },
                     }}
                     pageSizeOptions={[10, 25, 50, 100]}
                     disableRowSelectionOnClick
                     sx={{ border: 'none' }}
                   />
                </Box>
             </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MISReport;
