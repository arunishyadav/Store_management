import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DataGrid, GridRowModes, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, DeleteOutlined as DeleteIcon, Save as SaveIcon, Close as CancelIcon } from '@mui/icons-material';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const Materials = () => {
  const [rows, setRows] = useState([]);
  const [rowModesModel, setRowModesModel] = useState({});
  const [loading, setLoading] = useState(false);
  const locationId = useAuthStore(state => state.selectedLocation?.id);
  const currentUser = useAuthStore(state => state.user);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [open, setOpen] = useState(false);
  const [newMat, setNewMat] = useState({ 
    name: '', code: '', category: '', 
    arrivalQuantity: '', arrivalDate: '', arrivalTime: '', broughtBy: '' 
  });

  useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, stockRes] = await Promise.all([
        api.get(`/api/v1/materials?locationId=${locationId}`),
        api.get(`/api/v1/stock-entries?locationId=${locationId}`)
      ]);
      
      const materials = matRes.data;
      const entries = stockRes.data;

      const uniqueMaterialsMap = {};
      materials.forEach(mat => {
          if (!uniqueMaterialsMap[mat.materialCode]) {
              uniqueMaterialsMap[mat.materialCode] = { ...mat, ids: [mat.id] };
          } else {
              uniqueMaterialsMap[mat.materialCode].ids.push(mat.id);
          }
      });
      const uniqueMaterials = Object.values(uniqueMaterialsMap);

      const formattedRows = uniqueMaterials.map(mat => {
        const matEntries = entries.filter(e => mat.ids.includes(e.material?.id));
        const calculateGroupedArrival = (entriesList) => {
            let arrivalGroups = {};
            entriesList.forEach(e => {
                const bill = (e.billNumber || '').trim();
                const arrDate = e.arrivalDate || 'nodate';
                const arrTime = e.arrivalTime || 'notime';
                const brought = e.broughtBy || 'nobroughtby';
                const key = bill !== '' ? bill : `${arrDate}_${arrTime}_${brought}`;
                const arrQty = parseFloat(e.arrivalQuantity || 0);
                if (!arrivalGroups[key] || arrQty > arrivalGroups[key]) {
                    arrivalGroups[key] = arrQty;
                }
            });
            let total = 0;
            Object.values(arrivalGroups).forEach(val => total += val);
            return total;
        };

        const totalArrival = calculateGroupedArrival(matEntries);
        const totalOutgoing = matEntries.reduce((sum, e) => sum + (e.outgoingQuantity || 0), 0);
        const nowQuantity = totalArrival - totalOutgoing;
        const availableInStore = nowQuantity > 0 ? 'YES' : 'NO';
        
        const hasActivity = selectedDate 
            ? matEntries.some(e => e.arrivalDate && e.arrivalDate.startsWith(selectedDate))
            : true;

        const sortedArrivals = matEntries
            .filter(e => e.arrivalDate)
            .sort((a, b) => new Date(a.arrivalDate) - new Date(b.arrivalDate)); // OLDEST first
            
        const latestEntry = sortedArrivals.length > 0 ? sortedArrivals[0] : null;
        const arrivalDateStr = latestEntry && latestEntry.arrivalDate ? new Date(latestEntry.arrivalDate).toLocaleDateString() : 'N/A';
        const arrivalTimeStr = latestEntry && latestEntry.arrivalTime ? latestEntry.arrivalTime : '';
        const arrivalDateTime = arrivalDateStr !== 'N/A' ? `${arrivalDateStr} ${arrivalTimeStr}`.trim() : 'N/A';
        const laneWalaName = latestEntry ? (latestEntry.broughtBy || 'N/A') : 'N/A';

        return {
          id: mat.id,
          materialCode: mat.materialCode,
          name: mat.name,
          category: mat.category,
          arrivalQuantity: totalArrival,
          arrivalDate: arrivalDateTime,
          laneWalaName: laneWalaName,
          nowQuantity: nowQuantity,
          availableInStore: availableInStore,
          hasActivityToday: hasActivity
        };
      });

      const displayRows = selectedDate ? formattedRows.filter(r => r.hasActivityToday) : formattedRows;
      setRows(displayRows);
    } catch (error) {
      console.error("Error fetching materials data:", error);
    }
    setLoading(false);
  };



  const handleAddSubmit = async () => {
      try {
          // 1. Create the Material
          const matRes = await api.post('/api/v1/materials', {
              name: newMat.name,
              materialCode: newMat.code,
              category: newMat.category || 'Hardware',
              unit: 'Nos',
              minQuantity: 1,
              location: { id: locationId }
          });
          const createdMaterial = matRes.data;

          // 2. Always create an initial Stock Entry so it appears in the Entry Book
          const formatTime = (timeVal) => {
             if (!timeVal) return null;
             let t = timeVal.trim();
             if (t === "") return null;
             const parts = t.split(':');
             if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`;
             if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
             return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
          };
          
          const payload = {
            material: { id: createdMaterial.id },
            location: { id: locationId },
            arrivalQuantity: parseFloat(newMat.arrivalQuantity || 0),
            arrivalDate: newMat.arrivalDate || null,
            arrivalTime: formatTime(newMat.arrivalTime),
            broughtBy: newMat.broughtBy || '',
            outgoingQuantity: 0,
            issueDate: null,
            issuedBy: 'INITIAL_STOCK', // Secret flag to hide from Entry Book
            storeInchargeName: currentUser?.name || ''
          };
          await api.post('/api/v1/stock-entries', payload);

          setNewMat({ name: '', code: '', category: 'Hardware', arrivalQuantity: '', arrivalDate: todayStr, arrivalTime: '', broughtBy: '' });
          fetchData();
          setOpen(false);
      } catch (error) {
        console.error("Add Material Error", error);
        let msg = "Failed to add material or its entry.";
        if (error.response?.status === 500 || error.response?.status === 400) {
            msg = "Failed! This Item Code might already exist, or invalid data was entered.";
        }
        alert(error.response?.data?.message || msg);
      }
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const handleEditClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id) => async () => {
    if (window.confirm("Are you sure you want to delete this material?")) {
        try {
          await api.delete(`/api/v1/materials/${id}`);
          fetchData();
        } catch (error) {
          console.error("Delete failed", error);
          alert("Cannot delete material. It might have existing stock entries.");
        }
    }
  };

  const handleCancelClick = (id) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const processRowUpdate = async (newRow) => {
    try {
      if (!newRow.materialCode || !newRow.name) {
          throw new Error("Item Code and Name cannot be empty.");
      }
      
      // Send PUT request to update master material details
      const payload = {
          materialCode: newRow.materialCode,
          name: newRow.name,
          category: newRow.category,
          unit: 'Nos',
          minQuantity: 1,
          location: { id: locationId },
          active: true
      };
      await api.put(`/api/v1/materials/${newRow.id}`, payload);
      // Update local state smoothly without full reload if we want, but returning newRow does that
      return newRow;
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to update material.");
      throw error;
    }
  };

  const columns = [
    { field: 'materialCode', headerName: 'Item Code', width: 130, editable: true },
    { field: 'name', headerName: 'Item Name', flex: 1, minWidth: 200, editable: true },
    { field: 'category', headerName: 'Category', width: 130, editable: true },
    { field: 'arrivalQuantity', headerName: 'Quantity', type: 'number', width: 110, editable: false }, // Calculated
    { field: 'arrivalDate', headerName: 'Arrival Date & Time', width: 180, editable: false }, // Calculated
    { field: 'laneWalaName', headerName: 'Lane Wala Ka Name', width: 160, editable: false }, // Calculated
    { field: 'nowQuantity', headerName: 'Now Quantity', type: 'number', width: 120, editable: false }, // Calculated
    {
      field: 'availableInStore',
      headerName: 'Available In Store',
      width: 140,
      editable: false,
      renderCell: (params) => {
        let color = params.value === 'YES' ? 'success' : 'error';
        return (
          <Chip 
            label={params.value} 
            color={color} 
            size="small" 
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        );
      },
    }
  ];

  if (currentUser?.role !== 'USER') {
    columns.push({
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem icon={<SaveIcon />} label="Save" sx={{ color: 'primary.main' }} onClick={handleSaveClick(id)} key="save" />,
            <GridActionsCellItem icon={<CancelIcon />} label="Cancel" onClick={handleCancelClick(id)} key="cancel" />
          ];
        }
        const actions = [
          <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEditClick(id)} key="edit" />
        ];
        if (currentUser?.role === 'SUPER_ADMIN') {
            actions.push(<GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="error" key="delete" />);
        }
        return actions;
      },
    });
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ px: { xs: 2, sm: 0 }, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>Materials</Typography>
         <Box display="flex" gap={2} alignItems="center" sx={{ px: { xs: 2, sm: 0 }, width: { xs: '100%', sm: 'auto' }, overflowX: 'auto' }}>
           <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body1" fontWeight="bold" whiteSpace="nowrap">Sheet Date:</Typography>
              <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <Button 
                variant={selectedDate ? "contained" : "outlined"} 
                color={selectedDate ? "secondary" : "inherit"}
                size="small" 
                onClick={() => setSelectedDate('')}
                sx={{ whiteSpace: 'nowrap' }}
              >
                All Data
              </Button>
           </Box>
           {currentUser?.role !== 'USER' && (
             <Button 
               variant="contained" 
               color="primary" 
               startIcon={<AddIcon />} 
               sx={{ whiteSpace: 'nowrap' }}
               onClick={() => {
                 setNewMat(prev => ({ ...prev, arrivalDate: selectedDate || todayStr }));
                 setOpen(true);
              }}
            >
               Add Material
             </Button>
           )}
        </Box>
      </Box>

      <Paper sx={{ width: '100%', flexGrow: 1, borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
           <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              editMode="row"
              density="comfortable"
              rowModesModel={rowModesModel}
            onRowModesModelChange={handleRowModesModelChange}
            processRowUpdate={processRowUpdate}
            onProcessRowUpdateError={(error) => alert(error.message || "Failed to update material.")}
            slots={{ toolbar: GridToolbar }}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f7fa',
                borderBottom: '1px solid #e0e0e0',
              },
            }}
          />
          </Box>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Material & Entry</DialogTitle>
          <DialogContent dividers>
              <Typography variant="subtitle2" color="primary" gutterBottom>Master Details (Required)</Typography>
              <TextField autoFocus margin="dense" label="Item Code (e.g. MAT-123)" fullWidth variant="outlined" value={newMat.code} onChange={e => setNewMat({...newMat, code: e.target.value})} />
              <TextField margin="dense" label="Item Name" fullWidth variant="outlined" value={newMat.name} onChange={e => setNewMat({...newMat, name: e.target.value})} />
              <TextField margin="dense" label="Category" fullWidth variant="outlined" value={newMat.category} onChange={e => setNewMat({...newMat, category: e.target.value})} />
              
              <Typography variant="subtitle2" color="primary" sx={{ mt: 2 }} gutterBottom>Initial Stock Entry (Optional)</Typography>
              <TextField margin="dense" label="Arrival Quantity" type="number" fullWidth variant="outlined" value={newMat.arrivalQuantity} onChange={e => setNewMat({...newMat, arrivalQuantity: e.target.value})} />
              <TextField margin="dense" label="Arrival Date" type="date" fullWidth variant="outlined" InputLabelProps={{ shrink: true }} value={newMat.arrivalDate} onChange={e => setNewMat({...newMat, arrivalDate: e.target.value})} />
              <TextField margin="dense" label="Arrival Time (HH:MM)" type="time" fullWidth variant="outlined" InputLabelProps={{ shrink: true }} value={newMat.arrivalTime} onChange={e => setNewMat({...newMat, arrivalTime: e.target.value})} />
              <TextField margin="dense" label="Lane Wala Ka Name" fullWidth variant="outlined" value={newMat.broughtBy} onChange={e => setNewMat({...newMat, broughtBy: e.target.value})} />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
              <Button onClick={handleAddSubmit} variant="contained" disabled={!newMat.code || !newMat.name}>Add Material & Entry</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Materials;
