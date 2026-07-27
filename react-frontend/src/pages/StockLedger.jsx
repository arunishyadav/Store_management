import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Chip, Autocomplete, TextField } from '@mui/material';
import { DataGrid, GridRowModes, GridToolbar, GridToolbarContainer, GridActionsCellItem, GridRowEditStopReasons, useGridApiContext } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, DeleteOutlined as DeleteIcon, Save as SaveIcon, Close as CancelIcon } from '@mui/icons-material';
import api from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import useAuthStore from '../store/authStore';

const initialRow = {
  id: '',
  billNumber: '',
  material: null, // Needs selection
  arrivalQuantity: 0,
  arrivalDate: '',
  availableInStore: 'YES',
  outgoingQuantity: 0,
  issueDate: '',
  issuedBy: '',
  storeInchargeName: '',
  totalAvailableQty: 0,
  productLength: '',
  innerDiameter: '',
  kg: '',
  isNew: true
};

function AutocompleteEditCell(props) {
  const { id, value, field, materials, allBackendRows } = props;
  const apiRef = useGridApiContext();
  
  const handleChange = (event, newValue) => {
    const selectedCode = newValue ? newValue.value : '';
    apiRef.current.setEditCellValue({ id, field, value: selectedCode });
    
    if (selectedCode) {
       // Find the last entry for this materialCode to auto-fill using allBackendRows (ignoring date filter)
       let lastEntry = null;
       allBackendRows.forEach((row) => {
          if (row.materialCode === selectedCode && row.id !== id) {
             if (!lastEntry || new Date(row.arrivalDate) > new Date(lastEntry.arrivalDate)) {
                lastEntry = row;
             }
          }
       });
       
       let updateObj = { id, materialCode: selectedCode };
       
       const mat = materials.find(m => m.materialCode === selectedCode);
       if (mat) {
           apiRef.current.setEditCellValue({ id, field: 'materialName', value: mat.name });
           updateObj.materialName = mat.name;
       }

       if (lastEntry) {
          // Auto-fill other fields by setting their edit cell values
          const fieldsToCopy = ['billNumber', 'arrivalQuantity', 'arrivalDate', 'arrivalTime', 'broughtBy', 'productLength', 'innerDiameter', 'kg'];
          fieldsToCopy.forEach(f => {
             if (lastEntry[f] !== undefined && lastEntry[f] !== null) {
                 let valToSet = lastEntry[f];
                 if (f === 'arrivalDate' && typeof valToSet === 'string') {
                     // preserve local timezone
                     const parts = valToSet.split('-');
                     if (parts.length === 3) {
                         valToSet = new Date(parts[0], parts[1] - 1, parts[2]);
                     } else {
                         valToSet = new Date(valToSet);
                     }
                 }
                 apiRef.current.setEditCellValue({ id, field: f, value: valToSet });
                 updateObj[f] = valToSet;
             }
          });
       }
       // IMMEDIATELY update the row data so Name, Total Avl Q, and YES/NO calculate instantly!
       apiRef.current.updateRows([updateObj]);
    }
  };

  const options = materials.map(m => ({
     value: m.materialCode,
     label: `${m.materialCode} - ${m.name}`
  }));

  const selectedOption = options.find((opt) => opt.value === value) || null;

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.label || ''}
      value={selectedOption}
      onChange={handleChange}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      onKeyDown={(e) => e.stopPropagation()} // FIX: Stop DataGrid from intercepting typing!
      renderInput={(params) => (
        <TextField 
           {...params} 
           autoFocus 
           placeholder="Type to search..."
           size="small" 
           variant="outlined" 
           sx={{ backgroundColor: '#fff', minWidth: 200 }}
        />
      )}
      fullWidth
    />
  );
}

function NameEditCell(props) {
  const { id, value, field } = props;
  const apiRef = useGridApiContext();
  
  const handleChange = (event) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value });
  };

  return (
    <TextField
      value={value || ''}
      onChange={handleChange}
      autoFocus
      size="small"
      variant="outlined"
      sx={{ backgroundColor: '#fff', width: '100%' }}
    />
  );
}

export default function StockLedger() {
  const [rows, setRows] = useState([]);
  const [rowModesModel, setRowModesModel] = useState({});
  const [materials, setMaterials] = useState([]);
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const locationId = useAuthStore(state => state.selectedLocation?.id);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, matRes] = await Promise.all([
        api.get(`/api/v1/stock-entries?locationId=${locationId}`),
        api.get(`/api/v1/materials?locationId=${locationId}`)
      ]);
      // Format rows for DataGrid
      const formattedRows = stockRes.data.map(r => ({
        ...r,
        materialId: r.material?.id,
        materialName: r.material?.name,
        materialCode: r.material?.materialCode
      }));
      setRows(formattedRows);
      setMaterials(matRes.data);
    } catch (error) {
      console.error("Error fetching ledger data:", error);
    }
    setLoading(false);
  };

  const handleRowEditStop = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id) => async () => {
    try {
      await api.delete(`/api/v1/stock-entries/${id}`);
      setRows(rows.filter((row) => row.id !== id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleCancelClick = (id) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
    const editedRow = rows.find((row) => row.id === id);
    if (editedRow.isNew) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const processRowUpdate = async (newRow) => {
    const updatedRow = { ...newRow, isNew: false };
    
    // Auto Calculate (only total, leave availableInStore manual)
    const arr = parseFloat(newRow.arrivalQuantity || 0);
    const out = parseFloat(newRow.outgoingQuantity || 0);
    updatedRow.totalAvailableQty = arr - out;

    // Handle material manually
    let finalMaterialId = null;
    let finalMaterial = null;
    if (newRow.materialCode) {
       let mat = materials.find(m => m.materialCode === newRow.materialCode);
       if (mat) {
          finalMaterialId = mat.id;
          finalMaterial = mat;
       }
    }

    // Check if user edited the name of the product
    if (finalMaterial && newRow.materialName && newRow.materialName !== finalMaterial.name) {
       try {
           await api.put(`/api/v1/materials/${finalMaterialId}`, { ...finalMaterial, name: newRow.materialName });
           setMaterials(prev => prev.map(m => m.id === finalMaterialId ? { ...m, name: newRow.materialName } : m));
       } catch (e) {
           console.error("Failed to update material name", e);
       }
    }

    // Format dates for backend using local time (avoid UTC offset shifting the day)
    const formatDate = (dateVal) => {
       if (!dateVal) return null;
       const d = new Date(dateVal);
       if (isNaN(d.getTime())) return null;
       const year = d.getFullYear();
       const month = String(d.getMonth() + 1).padStart(2, '0');
       const day = String(d.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
    };

    const formatTime = (timeVal) => {
       if (!timeVal || typeof timeVal !== 'string') return null;
       let t = timeVal.trim();
       if (t === "") return null;
       const parts = t.split(':');
       if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`;
       if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
       return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    };

    // Prepare payload
    const payload = {
      ...updatedRow,
      arrivalDate: formatDate(updatedRow.arrivalDate),
      arrivalTime: formatTime(updatedRow.arrivalTime),
      issueDate: formatDate(updatedRow.issueDate),
      location: { id: locationId },
      material: finalMaterialId ? { id: finalMaterialId } : null
    };

    if (!payload.material) {
        throw new Error("Please select a valid Item Code");
    }

    try {
      let res;
      if (newRow.isNew) {
         // Create
         res = await api.post('/api/v1/stock-entries', payload);
      } else {
         // Update
         res = await api.put(`/api/v1/stock-entries/${newRow.id}`, payload);
      }
      
      const finalRow = {
        ...res.data,
        materialName: res.data.material?.name
      };
      
      setRows(rows.map((row) => (row.id === newRow.id ? finalRow : row)));
      return finalRow;
    } catch (error) {
      console.error("Save failed", error);
      throw error;
    }
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns = [
    { field: 'billNumber', headerName: 'bill number', width: 150, editable: true },
    { 
      field: 'materialCode', 
      headerName: 'Search Item (Code/Name)', 
      width: 250, 
      editable: true,
      renderEditCell: (params) => <AutocompleteEditCell {...params} materials={materials} allBackendRows={rows} />,
      renderCell: (params) => {
          if (!params.value) return '';
          const mat = materials.find(m => m.materialCode === params.value);
          return mat ? `${mat.materialCode} - ${mat.name}` : params.value;
      }
    },
    { 
      field: 'materialName', 
      headerName: 'name of product', 
      width: 180, 
      editable: true,
      renderEditCell: (params) => <NameEditCell {...params} />
    },
    { field: 'arrivalQuantity', headerName: 'Arrival Qty', type: 'number', width: 120, editable: true },
    { field: 'arrivalDate', headerName: 'Store Arrival Date', type: 'date', width: 130, editable: true,
      valueGetter: (value) => value ? new Date(value) : null
    },
    { field: 'arrivalTime', headerName: 'Arrival Time (HH:MM)', width: 130, editable: true },
    { field: 'broughtBy', headerName: 'Lane Wala Name', width: 150, editable: true },
    { 
      field: 'availableInStore', 
      headerName: 'Avlabel In Store', 
      width: 130, 
      editable: false,
      renderCell: (params) => (
        <Chip label={params.value} color={params.value === 'YES' ? 'success' : 'error'} variant="outlined" size="small" />
      ),
      valueGetter: (value, row) => {
          if (!row.materialCode) return 'NO';
          const allRows = rows.map(r => r.id === row.id ? row : r);
          if (!allRows.find(r => r.id === row.id)) allRows.push(row);
          const materialRows = allRows.filter(r => r.materialCode === row.materialCode);
          materialRows.sort((a, b) => {
              const dateA = a.issueDate ? new Date(a.issueDate) : (a.arrivalDate ? new Date(a.arrivalDate) : new Date(0));
              const dateB = b.issueDate ? new Date(b.issueDate) : (b.arrivalDate ? new Date(b.arrivalDate) : new Date(0));
              if (dateA < dateB) return -1;
              if (dateA > dateB) return 1;
              return 0;
          });
          let arrivalGroups = {};
          let totalOut = 0;
          let runningBalance = 0;
          for (let i = 0; i < materialRows.length; i++) {
             const r = materialRows[i];
             const bill = (r.billNumber || '').trim();
             const arrDate = r.arrivalDate || 'nodate';
             const arrTime = r.arrivalTime || 'notime';
             const brought = r.broughtBy || 'nobroughtby';
             const key = bill !== '' ? bill : `${arrDate}_${arrTime}_${brought}`;
             const arrQty = parseFloat(r.arrivalQuantity || 0);
             if (!arrivalGroups[key] || arrQty > arrivalGroups[key]) {
                 arrivalGroups[key] = arrQty;
             }
             let currentTotalArr = 0;
             Object.values(arrivalGroups).forEach(val => currentTotalArr += val);
             totalOut += parseFloat(r.outgoingQuantity || 0);
             runningBalance = currentTotalArr - totalOut;
             if (r.id === row.id) {
                 return runningBalance > 0 ? 'YES' : 'NO';
             }
          }
          return 'NO';
      }
    },
    { field: 'outgoingQuantity', headerName: 'Outgoing Quantity', type: 'number', width: 130, editable: true },
    { field: 'issueDate', headerName: 'Issue Date', type: 'date', width: 130, editable: true,
      valueGetter: (value) => value ? new Date(value) : null
    },
    { field: 'issuedBy', headerName: 'Issued By', width: 150, editable: true },
    { field: 'storeInchargeName', headerName: 'stInCh Name', width: 150, editable: true },
    { 
      field: 'totalAvailableQty', 
      headerName: 'Total Avl Q', 
      type: 'number', 
      width: 110,
      valueGetter: (value, row) => {
          if (!row.materialCode) return 0;
          const allRows = rows.map(r => r.id === row.id ? row : r);
          if (!allRows.find(r => r.id === row.id)) allRows.push(row);
          const materialRows = allRows.filter(r => r.materialCode === row.materialCode);
          materialRows.sort((a, b) => {
              const dateA = a.issueDate ? new Date(a.issueDate) : (a.arrivalDate ? new Date(a.arrivalDate) : new Date(0));
              const dateB = b.issueDate ? new Date(b.issueDate) : (b.arrivalDate ? new Date(b.arrivalDate) : new Date(0));
              if (dateA < dateB) return -1;
              if (dateA > dateB) return 1;
              return 0;
          });
          let arrivalGroups = {};
          let totalOut = 0;
          let runningBalance = 0;
          for (let i = 0; i < materialRows.length; i++) {
             const r = materialRows[i];
             const bill = (r.billNumber || '').trim();
             const arrDate = r.arrivalDate || 'nodate';
             const arrTime = r.arrivalTime || 'notime';
             const brought = r.broughtBy || 'nobroughtby';
             const key = bill !== '' ? bill : `${arrDate}_${arrTime}_${brought}`;
             const arrQty = parseFloat(r.arrivalQuantity || 0);
             if (!arrivalGroups[key] || arrQty > arrivalGroups[key]) {
                 arrivalGroups[key] = arrQty;
             }
             let currentTotalArr = 0;
             Object.values(arrivalGroups).forEach(val => currentTotalArr += val);
             totalOut += parseFloat(r.outgoingQuantity || 0);
             runningBalance = currentTotalArr - totalOut;
             if (r.id === row.id) {
                 return runningBalance;
             }
          }
          return 0;
      }
    },
    { field: 'productLength', headerName: 'Product Length', width: 130, editable: true },
    { field: 'innerDiameter', headerName: 'Inner Diameter', width: 130, editable: true },
    { field: 'kg', headerName: 'kg', width: 100, editable: true }
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

  function EditToolbar(props) {
    const { setRows, setRowModesModel } = props;
    const handleClick = () => {
      const id = uuidv4();
      const newArrivalDate = dateFilter || todayStr;
      setRows((oldRows) => [{ ...initialRow, id, arrivalDate: newArrivalDate }, ...oldRows]);
      setRowModesModel((oldModel) => ({
        ...oldModel,
        [id]: { mode: GridRowModes.Edit, fieldToFocus: 'billNumber' },
      }));
    };
    return (
      <GridToolbarContainer sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
            {currentUser?.role !== 'USER' ? (
              <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
                Add record
              </Button>
            ) : <Box />}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Sheet Date:</Typography>
                <input 
                    type="date" 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value)} 
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                {dateFilter && <Button size="small" color="secondary" onClick={() => setDateFilter('')}>Clear</Button>}
            </Box>
        </Box>
        <GridToolbar />
      </GridToolbarContainer>
    );
  }

  const filteredRows = dateFilter 
    ? rows.filter(r => {
         const outQty = parseFloat(r.outgoingQuantity || 0);
         if (outQty > 0 && r.issueDate) {
             return r.issueDate.startsWith(dateFilter);
         }
         if (r.arrivalDate) {
             return r.arrivalDate.startsWith(dateFilter);
         }
         return false;
    })
    : rows;

  return (
    <Box sx={{ p: { xs: 0, sm: 1, md: 2 }, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mt: { xs: 1, sm: 0 }, px: { xs: 2, sm: 0 }, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Entry Book
      </Typography>
      <Paper sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              editMode="row"
              rowModesModel={rowModesModel}
              density="comfortable"
              onRowModesModelChange={handleRowModesModelChange}
              onRowEditStop={handleRowEditStop}
              processRowUpdate={processRowUpdate}
              onProcessRowUpdateError={(error) => alert(error.message || "Failed to save row.")}
              slots={{ toolbar: EditToolbar }}
              slotProps={{ toolbar: { setRows, setRowModesModel } }}
              sx={{
                 border: 'none',
                 '& .MuiDataGrid-main': { overflow: 'visible' },
                 '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#f8fafc' }
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
