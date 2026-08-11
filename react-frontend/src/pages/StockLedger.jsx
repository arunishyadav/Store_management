import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Chip, Autocomplete, TextField, InputAdornment, Card, CardContent, Grid, Divider, Dialog, DialogTitle, DialogContent, DialogActions, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DataGrid, GridRowModes, GridToolbar, GridToolbarContainer, GridActionsCellItem, GridRowEditStopReasons, useGridApiContext } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, DeleteOutlined as DeleteIcon, Save as SaveIcon, Close as CancelIcon, Search as SearchIcon, Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';
import api from '../services/api';
import { v4 as uuidv4 } from 'uuid';
import useAuthStore from '../store/authStore';
import { exportToCSV, printPDF } from '../utils/exportUtils';

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

let globalAllStockEntries = [];

function calculateStockState(row, allBackendRows) {
    if (!row || !row.materialCode) return { runningBalance: 0, available: 'NO' };
    
    const allRows = [...allBackendRows];
    const existingIndex = allRows.findIndex(r => r.id === row.id);
    if (existingIndex !== -1) {
        allRows[existingIndex] = row;
    } else {
        allRows.push(row);
    }
    
    const materialRows = allRows.filter(r => r.materialCode === row.materialCode).map((r, i) => ({ ...r, _index: i }));
    
    const getNormalizedDate = (d) => {
        if (!d) return 'nodate';
        if (d instanceof Date) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return String(d).substring(0, 10);
    };

    materialRows.sort((a, b) => {
        const isNewA = !!a.isNew;
        const isNewB = !!b.isNew;
        if (!isNewA && isNewB) return -1;
        if (isNewA && !isNewB) return 1;
        
        const dateStrA = getNormalizedDate(a.issueDate || a.arrivalDate);
        const dateStrB = getNormalizedDate(b.issueDate || b.arrivalDate);
        if (dateStrA < dateStrB) return -1;
        if (dateStrA > dateStrB) return 1;
        
        const outA = parseFloat(a.outgoingQuantity || 0);
        const outB = parseFloat(b.outgoingQuantity || 0);
        if (outA === 0 && outB > 0) return -1;
        if (outA > 0 && outB === 0) return 1;

        return b._index - a._index;
    });

    let arrivalGroups = {};
    let totalOut = 0;
    let runningBalance = 0;
    
    for (let i = 0; i < materialRows.length; i++) {
        const r = materialRows[i];
        const arrDate = getNormalizedDate(r.arrivalDate);
        const arrTime = r.arrivalTime || 'notime';
        const arrQty = parseFloat(r.arrivalQuantity || 0);
        const key = `${arrDate}_${arrTime}_${arrQty}`;
        
        if (!arrivalGroups[key] || arrQty > arrivalGroups[key]) {
            arrivalGroups[key] = arrQty;
        }
        
        let currentTotalArr = 0;
        Object.values(arrivalGroups).forEach(val => currentTotalArr += val);
        totalOut += parseFloat(r.outgoingQuantity || 0);
        runningBalance = currentTotalArr - totalOut;
        
        if (r.id === row.id) {
            return { runningBalance, available: runningBalance > 0 ? 'YES' : 'NO' };
        }
    }
    return { runningBalance: 0, available: 'NO' };
}

function AutocompleteEditCell(props) {
  const { id, value, field, materials } = props;
  const apiRef = useGridApiContext();
  
  const options = useMemo(() => {
    const optionsMap = {};
    
    // 1. Build options from all arrival stock entries first
    (globalAllStockEntries || []).forEach(entry => {
      if (!entry.materialCode) return;
      const code = String(entry.materialCode).trim();
      const name = entry.materialName && String(entry.materialName).trim() ? String(entry.materialName).trim() : '';
      const dateStr = entry.arrivalDate ? String(entry.arrivalDate).substring(0, 10) : '';
      const arrQty = entry.arrivalQuantity || 0;

      const key = `${code.toLowerCase()}___${name.toLowerCase()}___${dateStr}`;
      
      const dateDisplay = dateStr ? ` (${dateStr})` : '';
      const qtyDisplay = arrQty ? ` [Arr Qty: ${arrQty}]` : '';
      const nameDisplay = name ? ` - ${name}` : '';
      const label = `${code}${nameDisplay}${dateDisplay}${qtyDisplay}`;

      if (!optionsMap[key]) {
        optionsMap[key] = {
          value: code,
          materialCode: code,
          materialName: name,
          label: label,
          entry: entry
        };
      }
    });

    // 2. Add master materials if not already present
    (materials || []).forEach(m => {
      if (!m.materialCode) return;
      const code = String(m.materialCode).trim();
      const name = m.name && String(m.name).trim() ? String(m.name).trim() : '';
      const key = `${code.toLowerCase()}___${name.toLowerCase()}___master`;
      
      const matchExists = Object.keys(optionsMap).some(k => k.startsWith(`${code.toLowerCase()}___`));
      if (!matchExists && !optionsMap[key]) {
        optionsMap[key] = {
          value: code,
          materialCode: code,
          materialName: name,
          label: `${code}${name ? ' - ' + name : ''}`,
          entry: null
        };
      }
    });

    return Object.values(optionsMap);
  }, [materials]);

  const handleChange = (event, newValue) => {
    if (!newValue) {
      apiRef.current.setEditCellValue({ id, field, value: '' });
      return;
    }

    const selectedCode = typeof newValue === 'string' ? newValue : newValue.materialCode;
    const selectedName = typeof newValue === 'object' && newValue.materialName ? newValue.materialName : '';
    const targetEntry = typeof newValue === 'object' ? newValue.entry : null;

    apiRef.current.setEditCellValue({ id, field, value: selectedCode });
    
    let updateObj = { id, materialCode: selectedCode };
    if (selectedName) {
      apiRef.current.setEditCellValue({ id, field: 'materialName', value: selectedName });
      updateObj.materialName = selectedName;
    }

    if (targetEntry) {
       const fieldsToCopy = ['billNumber', 'arrivalQuantity', 'arrivalDate', 'arrivalTime', 'broughtBy', 'storeInchargeName', 'productLength', 'innerDiameter', 'kg'];
       fieldsToCopy.forEach(f => {
          if (targetEntry[f] !== undefined && targetEntry[f] !== null) {
              let valToSet = targetEntry[f];
              if (f === 'arrivalDate' && typeof valToSet === 'string') {
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
    } else {
       const mat = materials.find(m => m.materialCode.toLowerCase() === selectedCode.toLowerCase());
       if (mat && !selectedName) {
           apiRef.current.setEditCellValue({ id, field: 'materialName', value: mat.name });
           updateObj.materialName = mat.name;
       }
    }
    
    apiRef.current.updateRows([updateObj]);

    const dummyRow = { id, materialCode: selectedCode, isNew: true, outgoingQuantity: 0, arrivalDate: updateObj.arrivalDate || '' };
    const stockState = calculateStockState(dummyRow, globalAllStockEntries);
    if (stockState.runningBalance <= 0) {
        alert(`Out of Stock! Material '${selectedCode}' is currently not available in the store (Balance: ${stockState.runningBalance}).`);
    }
  };

  const selectedOption = options.find((opt) => opt.value === value || opt.label.startsWith(value)) || null;

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.label || ''}
      value={selectedOption}
      onChange={handleChange}
      isOptionEqualToValue={(option, val) => option.value === val.value || option.label === val.label}
      onKeyDown={(e) => e.stopPropagation()}
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

function EditToolbar(props) {
  const { setRows, setRowModesModel, searchQuery, setSearchQuery, availabilityFilter, setAvailabilityFilter, startDate, setStartDate, endDate, setEndDate, dateFilter, setDateFilter, handleExportCSV, handlePrintPDF, currentUser, todayStr } = props;
  const handleClick = () => {
    const id = uuidv4();
    const newArrivalDate = dateFilter || todayStr;
    setRows((oldRows) => [{ ...initialRow, id, isNew: true, arrivalDate: newArrivalDate }, ...oldRows]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: 'billNumber' },
    }));
  };
  return (
    <GridToolbarContainer sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', p: { xs: 1, sm: 1.5 }, gap: 1 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', md: 'center' }, 
        gap: 1.5, 
        width: '100%' 
      }}>
          {currentUser?.role !== 'USER' ? (
            <Button color="primary" variant="contained" startIcon={<AddIcon />} onClick={handleClick} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Add record
            </Button>
          ) : <Box />}

          <TextField
            size="small"
            placeholder="Search by Code, Name, Issued By, Bill No, Incharge, Brought By..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: '320px' }, backgroundColor: '#ffffff' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="primary" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <Button size="small" sx={{ minWidth: 0, p: 0.2 }} onClick={() => setSearchQuery('')}>✕</Button>
                </InputAdornment>
              ) : null
            }}
          />

          {/* Stock Availability Filter (YES / NO / ALL) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" fontWeight="bold" sx={{ mr: 0.5 }}>Stock:</Typography>
            <ToggleButtonGroup
              size="small"
              value={availabilityFilter}
              exclusive
              onChange={(e, val) => val && setAvailabilityFilter(val)}
              color="primary"
            >
              <ToggleButton value="ALL" sx={{ px: 1.5, py: 0.5, fontWeight: 'bold' }}>ALL</ToggleButton>
              <ToggleButton value="YES" sx={{ px: 1.5, py: 0.5, fontWeight: 'bold', color: 'success.main' }}>YES (In Stock)</ToggleButton>
              <ToggleButton value="NO" sx={{ px: 1.5, py: 0.5, fontWeight: 'bold', color: 'error.main' }}>NO (Out of Stock)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Export Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button size="small" variant="outlined" color="secondary" startIcon={<PrintIcon />} onClick={handlePrintPDF}>
              Print PDF
            </Button>
          </Box>
      </Box>

      {/* Date Filters Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', pt: 0.5, borderTop: '1px solid #f0f0f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sheet Date:</Typography>
              <input 
                  type="date" 
                  value={dateFilter} 
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value) { setStartDate(''); setEndDate(''); }
                  }} 
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', maxWidth: '150px' }}
              />
          </Box>

          <Typography variant="caption" color="text.secondary" fontWeight="bold">OR Date Range:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) setDateFilter('');
                  }} 
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', maxWidth: '140px' }}
              />
              <Typography variant="caption">to</Typography>
              <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value) setDateFilter('');
                  }} 
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', maxWidth: '140px' }}
              />
          </Box>

          <Button 
            variant={(!dateFilter && !startDate && !endDate) ? "contained" : "outlined"} 
            color={(!dateFilter && !startDate && !endDate) ? "secondary" : "inherit"}
            size="small" 
            onClick={() => { setDateFilter(''); setStartDate(''); setEndDate(''); }}
            sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
          >
            All Data
          </Button>
      </Box>

      <GridToolbar />
    </GridToolbarContainer>
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
      
      const mapped = stockRes.data.map(r => ({
        ...r,
        materialId: r.material?.id || r.materialId,
        materialName: (r.materialName && String(r.materialName).trim()) ? r.materialName : (r.material?.name || ''),
        materialCode: r.materialCode || r.material?.materialCode
      }));
      
      globalAllStockEntries = mapped;

      // Match master materials by materialCode so all store items appear in All Data
      const existingMatCodes = new Set(
        mapped.map(r => (r.materialCode ? String(r.materialCode).trim().toLowerCase() : null)).filter(Boolean)
      );

      const masterOnlyRows = matRes.data
        .filter(m => m.materialCode && !existingMatCodes.has(String(m.materialCode).trim().toLowerCase()))
        .map(m => ({
           id: `mat-${m.id}`,
           materialId: m.id,
           materialCode: m.materialCode,
           materialName: m.name,
           arrivalQuantity: 0,
           outgoingQuantity: 0,
           arrivalDate: m.createdAt ? String(m.createdAt).substring(0, 10) : todayStr,
           broughtBy: 'Store Initial Stock',
           issuedBy: 'N/A'
        }));

      const formattedRows = [
        ...mapped.map(r => ({
           ...r,
           issuedBy: r.issuedBy === 'INITIAL_STOCK' ? 'Store Initial Stock' : (r.issuedBy || 'N/A')
        })),
        ...masterOnlyRows
      ];
      
      setRows(formattedRows);

      // Deduplicate materials by materialCode so dropdown contains unique items ONLY
      const uniqueMatMap = {};
      matRes.data.forEach(m => {
        if (m.materialCode && !uniqueMatMap[m.materialCode.trim().toLowerCase()]) {
          uniqueMatMap[m.materialCode.trim().toLowerCase()] = m;
        }
      });
      setMaterials(Object.values(uniqueMatMap));
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

    // Check if we are issuing more than available
    if (!updatedRow.isNew && out > 0) {
        const stockState = calculateStockState({ ...updatedRow, outgoingQuantity: 0, isNew: true }, globalAllStockEntries);
        if (out > stockState.runningBalance && stockState.runningBalance >= 0) {
            // Note: We allow edit if they are fixing a mistake, but we warn them.
            // If they are creating a new issue, we throw an error!
            const isNewToBackend = !globalAllStockEntries.some(r => r.id === newRow.id);
            if (isNewToBackend) {
                throw new Error(`Cannot issue ${out}. Only ${stockState.runningBalance} available in store.`);
            }
        }
    }

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
    let payload = {
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
          return calculateStockState(row, globalAllStockEntries).available;
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
          return calculateStockState(row, globalAllStockEntries).runningBalance;
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
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // 'ALL' | 'YES' | 'NO'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);
  const [mobileEditingRow, setMobileEditingRow] = useState(null);

  const handleMobileAddClick = () => {
    setMobileEditingRow({
      ...initialRow,
      id: uuidv4(),
      arrivalDate: dateFilter || todayStr,
      isNew: true
    });
    setMobileEditOpen(true);
  };

  const handleMobileEditClick = (row) => {
    setMobileEditingRow({ ...row, isNew: false });
    setMobileEditOpen(true);
  };

  const handleMobileCodeChange = (e) => {
    const selectedCode = e.target.value;
    
    const mat = materials.find(m => m.materialCode.toLowerCase() === selectedCode.toLowerCase());
    const matName = mat ? mat.name : '';

    let lastEntry = null;
    globalAllStockEntries.forEach((row) => {
      if (row.materialCode && row.materialCode.toLowerCase() === selectedCode.toLowerCase()) {
        if (!lastEntry || new Date(row.arrivalDate) > new Date(lastEntry.arrivalDate)) {
          lastEntry = row;
        }
      }
    });

    setMobileEditingRow(prev => {
      const updated = {
        ...prev,
        materialCode: selectedCode,
        materialName: matName || prev?.materialName || ''
      };

      if (lastEntry) {
        updated.arrivalQuantity = lastEntry.arrivalQuantity || prev?.arrivalQuantity || '';
        updated.arrivalDate = lastEntry.arrivalDate || prev?.arrivalDate || (dateFilter || todayStr);
        updated.arrivalTime = lastEntry.arrivalTime || prev?.arrivalTime || '';
        updated.broughtBy = lastEntry.broughtBy || prev?.broughtBy || '';
        updated.storeInchargeName = lastEntry.storeInchargeName || prev?.storeInchargeName || '';
        updated.productLength = lastEntry.productLength || prev?.productLength || '';
        updated.innerDiameter = lastEntry.innerDiameter || prev?.innerDiameter || '';
        updated.kg = lastEntry.kg || prev?.kg || '';
      }
      return updated;
    });
  };

  const handleMobileSave = async () => {
    if (!mobileEditingRow) return;
    try {
      let materialId = mobileEditingRow.materialId;
      if (!materialId && mobileEditingRow.materialCode) {
        const matMatch = materials.find(m => m.materialCode.toLowerCase() === mobileEditingRow.materialCode.toLowerCase());
        if (matMatch) materialId = matMatch.id;
      }
      
      const payload = {
        id: mobileEditingRow.id.startsWith('mat-') ? null : mobileEditingRow.id,
        billNumber: mobileEditingRow.billNumber || '',
        material: materialId ? { id: materialId } : null,
        materialCode: mobileEditingRow.materialCode,
        materialName: mobileEditingRow.materialName,
        arrivalQuantity: parseFloat(mobileEditingRow.arrivalQuantity || 0),
        arrivalDate: mobileEditingRow.arrivalDate || null,
        arrivalTime: mobileEditingRow.arrivalTime || null,
        broughtBy: mobileEditingRow.broughtBy || '',
        outgoingQuantity: parseFloat(mobileEditingRow.outgoingQuantity || 0),
        issueDate: mobileEditingRow.issueDate || null,
        issuedBy: mobileEditingRow.issuedBy || '',
        storeInchargeName: mobileEditingRow.storeInchargeName || '',
        productLength: mobileEditingRow.productLength || '',
        innerDiameter: mobileEditingRow.innerDiameter || '',
        kg: mobileEditingRow.kg || '',
        location: { id: locationId }
      };

      await api.post('/api/v1/stock-entries', payload);
      setMobileEditOpen(false);
      fetchData();
    } catch (error) {
      console.error("Mobile save failed:", error);
      alert("Failed to save record.");
    }
  };

  const handleMobileDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await api.delete(`/api/v1/stock-entries/${id}`);
        fetchData();
      } catch (error) {
        console.error("Delete failed", error);
        alert("Failed to delete entry.");
      }
    }
  };

  // Filter rows logic
  const filteredRows = rows.filter(r => {
    const stockState = calculateStockState(r, globalAllStockEntries);

    let matchesAvailability = true;
    if (availabilityFilter === 'YES') {
      matchesAvailability = stockState.runningBalance > 0;
    } else if (availabilityFilter === 'NO') {
      matchesAvailability = stockState.runningBalance <= 0;
    }

    let matchesDate = true;
    const entryDateStr = r.issueDate || r.arrivalDate || '';
    const entryDate = entryDateStr ? String(entryDateStr).substring(0, 10) : '';

    if (startDate && endDate) {
      matchesDate = entryDate >= startDate && entryDate <= endDate;
    } else if (dateFilter) {
      const outQty = parseFloat(r.outgoingQuantity || 0);
      if (outQty > 0 && r.issueDate) {
        matchesDate = r.issueDate.startsWith(dateFilter);
      } else if (r.arrivalDate) {
        matchesDate = r.arrivalDate.startsWith(dateFilter);
      } else {
        matchesDate = false;
      }
    }

    let matchesSearch = true;
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      const code = String(r.materialCode || '').toLowerCase();
      const name = String(r.materialName || '').toLowerCase();
      const bill = String(r.billNumber || '').toLowerCase();
      const issued = String(r.issuedBy || '').toLowerCase();
      const incharge = String(r.storeInchargeName || '').toLowerCase();
      const brought = String(r.broughtBy || '').toLowerCase();
      const arrQty = String(r.arrivalQuantity || '');
      const outQty = String(r.outgoingQuantity || '');
      const arrDate = String(r.arrivalDate || '');
      const issDate = String(r.issueDate || '');
      const length = String(r.productLength || '').toLowerCase();
      const dia = String(r.innerDiameter || '').toLowerCase();
      const kgStr = String(r.kg || '').toLowerCase();

      matchesSearch = (
        code.includes(q) || name.includes(q) || bill.includes(q) ||
        issued.includes(q) || incharge.includes(q) || brought.includes(q) ||
        arrQty.includes(q) || outQty.includes(q) || arrDate.includes(q) ||
        issDate.includes(q) || length.includes(q) || dia.includes(q) || kgStr.includes(q)
      );
    }
    return matchesAvailability && matchesDate && matchesSearch;
  });

  const handleExportCSV = () => {
    const exportData = filteredRows.map(r => {
      const state = calculateStockState(r, globalAllStockEntries);
      return {
        'Bill Number': r.billNumber || 'N/A',
        'Material Code': r.materialCode || 'N/A',
        'Material Name': r.materialName || 'N/A',
        'Arrival Qty': r.arrivalQuantity || 0,
        'Arrival Date': r.arrivalDate ? new Date(r.arrivalDate).toLocaleDateString() : 'N/A',
        'Arrival Time': r.arrivalTime || '',
        'Brought By': r.broughtBy || 'N/A',
        'Available Status': state.available,
        'Outgoing Qty': r.outgoingQuantity || 0,
        'Issue Date': r.issueDate ? new Date(r.issueDate).toLocaleDateString() : 'N/A',
        'Issued By': r.issuedBy || 'N/A',
        'Store Incharge': r.storeInchargeName || 'N/A',
        'Running Balance': state.runningBalance
      };
    });
    exportToCSV(exportData, `EntryBook_${availabilityFilter}_Stock_${new Date().toISOString().substring(0,10)}.csv`);
  };

  const handlePrintPDF = () => {
    const printData = filteredRows.map(r => {
      const state = calculateStockState(r, globalAllStockEntries);
      return {
        bill: r.billNumber || 'N/A',
        code: r.materialCode || 'N/A',
        name: r.materialName || 'N/A',
        arrivalQty: r.arrivalQuantity || 0,
        arrivalDate: r.arrivalDate ? new Date(r.arrivalDate).toLocaleDateString() : 'N/A',
        broughtBy: r.broughtBy || 'N/A',
        status: state.available,
        outQty: r.outgoingQuantity || 0,
        issueDate: r.issueDate ? new Date(r.issueDate).toLocaleDateString() : 'N/A',
        issuedBy: r.issuedBy || 'N/A',
        balance: state.runningBalance
      };
    });
    printPDF(printData, `Entry Book Ledger (${availabilityFilter})`, [
      { field: 'code', headerName: 'Item Code' },
      { field: 'name', headerName: 'Material Name' },
      { field: 'arrivalQty', headerName: 'Arr Qty' },
      { field: 'arrivalDate', headerName: 'Arr Date' },
      { field: 'broughtBy', headerName: 'Brought By' },
      { field: 'status', headerName: 'Status' },
      { field: 'outQty', headerName: 'Out Qty' },
      { field: 'issuedBy', headerName: 'Issued By' },
      { field: 'balance', headerName: 'Balance' }
    ]);
  };

  return (
    <Box sx={{ p: { xs: 0, sm: 1, md: 2 }, height: { xs: 'calc(100vh - 120px)', sm: 'calc(100vh - 100px)' }, display: 'flex', flexDirection: 'column', maxWidth: '100vw', boxSizing: 'border-box' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mt: { xs: 0.5, sm: 0 }, px: { xs: 1.5, sm: 0 }, fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>
        Entry Book
      </Typography>
      <Paper sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, borderRadius: { xs: 2, sm: 3 } }}>
        {loading ? (
           <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          <>
            {/* Desktop View (md+) */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1, width: '100%', height: '100%', minHeight: 0 }}>
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
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 100 },
                  },
                }}
                pageSizeOptions={[25, 50, 100]}
                slots={{ toolbar: EditToolbar }}
                slotProps={{ toolbar: { setRows, setRowModesModel, searchQuery, setSearchQuery, availabilityFilter, setAvailabilityFilter, startDate, setStartDate, endDate, setEndDate, dateFilter, setDateFilter, handleExportCSV, handlePrintPDF, currentUser, todayStr } }}
                sx={{
                   border: 'none',
                   '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#f8fafc' }
                }}
              />
            </Box>

            {/* Mobile View (< md) with STICKY TOP TOOLBAR */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Sticky Mobile Toolbar */}
              <Box sx={{ 
                p: 1.2, 
                borderBottom: '1px solid #e2e8f0', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1, 
                backgroundColor: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                {/* Row 1: Search + Filters Toggle Button */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Code, Name, Issued By, Bill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <Button size="small" sx={{ minWidth: 0, p: 0.2 }} onClick={() => setSearchQuery('')}>✕</Button>
                        </InputAdornment>
                      ) : null
                    }}
                  />
                  <Button
                    size="small"
                    variant={showMobileFilters ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    sx={{ minWidth: '42px', px: 1, py: 0.7, fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    ⚙️
                  </Button>
                </Box>

                {/* Row 2: Stock Availability Toggle + Add Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <ToggleButtonGroup
                    size="small"
                    value={availabilityFilter}
                    exclusive
                    onChange={(e, val) => val && setAvailabilityFilter(val)}
                    color="primary"
                  >
                    <ToggleButton value="ALL" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold' }}>ALL</ToggleButton>
                    <ToggleButton value="YES" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold', color: 'success.main' }}>YES (Stock)</ToggleButton>
                    <ToggleButton value="NO" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold', color: 'error.main' }}>NO (Out)</ToggleButton>
                  </ToggleButtonGroup>

                  {currentUser?.role !== 'USER' && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={handleMobileAddClick}
                      sx={{ py: 0.4, px: 1.2, fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                      + Add
                    </Button>
                  )}
                </Box>

                {/* Expandable Filters Section (Export CSV/PDF, Date Range) */}
                {showMobileFilters && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleExportCSV} fullWidth sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                        Export CSV
                      </Button>
                      <Button size="small" variant="outlined" color="secondary" startIcon={<PrintIcon />} onClick={handlePrintPDF} fullWidth sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                        Print PDF
                      </Button>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Date:</Typography>
                        <input
                          type="date"
                          value={dateFilter}
                          onChange={(e) => {
                            setDateFilter(e.target.value);
                            if (e.target.value) { setStartDate(''); setEndDate(''); }
                          }}
                          style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.8rem', width: '100%' }}
                        />
                      </Box>
                      <Button 
                        variant={(!dateFilter && !startDate && !endDate) ? "contained" : "outlined"} 
                        color={(!dateFilter && !startDate && !endDate) ? "secondary" : "inherit"}
                        size="small" 
                        onClick={() => { setDateFilter(''); setStartDate(''); setEndDate(''); }}
                        sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', px: 1, py: 0.3, fontSize: '0.75rem' }}
                      >
                        All Data
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range:</Typography>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (e.target.value) setDateFilter('');
                        }}
                        style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.75rem', flexGrow: 1 }}
                      />
                      <Typography variant="caption">to</Typography>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          if (e.target.value) setDateFilter('');
                        }}
                        style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.75rem', flexGrow: 1 }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Cards List container with full flex scroll */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, backgroundColor: '#f8fafc' }}>
                {filteredRows.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body1">No records found matching search / date.</Typography>
                  </Box>
                ) : (
                  filteredRows.map((row) => {
                    const stockState = calculateStockState(row, globalAllStockEntries);
                    return (
                      <Card key={row.id} sx={{ mb: 1.5, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flexGrow: 1, mr: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary.main" sx={{ lineHeight: 1.2 }}>
                                {row.materialCode ? `${row.materialCode} - ${row.materialName || ''}` : 'No Material'}
                              </Typography>
                              {row.billNumber && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Bill: {row.billNumber}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={stockState.available}
                              color={stockState.available === 'YES' ? 'success' : 'error'}
                              size="small"
                              sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                            />
                          </Box>

                          <Divider sx={{ my: 1 }} />

                          <Grid container spacing={1} sx={{ mt: 0.5 }}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Arrival Qty</Typography>
                              <Typography variant="body2" fontWeight="bold">{row.arrivalQuantity || 0}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Outgoing Qty (Out)</Typography>
                              <Typography variant="body2" fontWeight="bold" color={row.outgoingQuantity > 0 ? 'error.main' : 'text.primary'}>
                                {row.outgoingQuantity || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Arrival Date & Time</Typography>
                              <Typography variant="body2">
                                {row.arrivalDate ? `${new Date(row.arrivalDate).toLocaleDateString()} ${row.arrivalTime || ''}`.trim() : 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Issue Date</Typography>
                              <Typography variant="body2">{row.issueDate ? new Date(row.issueDate).toLocaleDateString() : 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Brought By</Typography>
                              <Typography variant="body2">{row.broughtBy || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Issued By</Typography>
                              <Typography variant="body2">{row.issuedBy || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary" display="block">Store Incharge</Typography>
                              <Typography variant="body2">{row.storeInchargeName || 'N/A'}</Typography>
                            </Grid>
                            {(row.productLength || row.innerDiameter || row.kg) && (
                              <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" display="block">Spec (L/Dia/KG)</Typography>
                                <Typography variant="body2">
                                  {[row.productLength, row.innerDiameter, row.kg ? `${row.kg}kg` : null].filter(Boolean).join(' / ') || 'N/A'}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>

                          <Box sx={{ mt: 1.5, p: 1, borderRadius: 2, backgroundColor: '#edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" fontWeight="bold" color="text.primary">Available Stock Balance:</Typography>
                            <Typography variant="subtitle2" fontWeight="bold" color="success.dark">
                              {stockState.runningBalance} Nos
                            </Typography>
                          </Box>

                          {currentUser?.role !== 'USER' && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
                              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleMobileEditClick(row)}>
                                Edit
                              </Button>
                              {currentUser?.role === 'SUPER_ADMIN' && (
                                <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClick(row.id)}>
                                  Delete
                                </Button>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </Box>
            </Box>
          </>
        )}
      </Paper>

      {/* Mobile Edit Record Dialog */}
      <Dialog open={mobileEditOpen} onClose={() => setMobileEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {mobileEditingRow?.isNew ? 'Add New Entry Record' : 'Edit Entry Record'}
        </DialogTitle>
        <DialogContent dividers>
          {mobileEditingRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
              <Autocomplete
                freeSolo
                options={(() => {
                  const optionsMap = {};
                  (globalAllStockEntries || []).forEach(entry => {
                    if (!entry.materialCode) return;
                    const code = String(entry.materialCode).trim();
                    const name = entry.materialName && String(entry.materialName).trim() ? String(entry.materialName).trim() : '';
                    const dateStr = entry.arrivalDate ? String(entry.arrivalDate).substring(0, 10) : '';
                    const arrQty = entry.arrivalQuantity || 0;

                    const key = `${code.toLowerCase()}___${name.toLowerCase()}___${dateStr}`;
                    const dateDisplay = dateStr ? ` (${dateStr})` : '';
                    const qtyDisplay = arrQty ? ` [Arr: ${arrQty}]` : '';
                    const nameDisplay = name ? ` - ${name}` : '';
                    const label = `${code}${nameDisplay}${dateDisplay}${qtyDisplay}`;

                    if (!optionsMap[key]) {
                      optionsMap[key] = { code, name, label, entry };
                    }
                  });

                  (materials || []).forEach(m => {
                    if (!m.materialCode) return;
                    const code = String(m.materialCode).trim();
                    const name = m.name && String(m.name).trim() ? String(m.name).trim() : '';
                    const key = `${code.toLowerCase()}___${name.toLowerCase()}___master`;
                    const matchExists = Object.keys(optionsMap).some(k => k.startsWith(`${code.toLowerCase()}___`));
                    if (!matchExists && !optionsMap[key]) {
                      optionsMap[key] = { code, name, label: `${code}${name ? ' - ' + name : ''}`, entry: null };
                    }
                  });

                  return Object.values(optionsMap);
                })()}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.label || ''}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.label}>
                    <Typography variant="body2">
                      <strong>{option.label}</strong>
                    </Typography>
                  </Box>
                )}
                value={mobileEditingRow.materialCode ? `${mobileEditingRow.materialCode}${mobileEditingRow.materialName ? ` - ${mobileEditingRow.materialName}` : ''}` : ''}
                onChange={(event, newValue) => {
                  let selectedCode = '';
                  let selectedName = '';
                  let targetEntry = null;

                  if (typeof newValue === 'string') {
                    selectedCode = newValue;
                  } else if (newValue && newValue.code) {
                    selectedCode = newValue.code;
                    selectedName = newValue.name;
                    targetEntry = newValue.entry;
                  }

                  if (selectedCode) {
                    setMobileEditingRow(prev => {
                      const updated = {
                        ...prev,
                        materialCode: selectedCode,
                        materialName: selectedName || prev?.materialName || ''
                      };

                      if (targetEntry) {
                        updated.arrivalQuantity = targetEntry.arrivalQuantity || prev?.arrivalQuantity || '';
                        updated.arrivalDate = targetEntry.arrivalDate ? String(targetEntry.arrivalDate).substring(0, 10) : (dateFilter || todayStr);
                        updated.arrivalTime = targetEntry.arrivalTime || prev?.arrivalTime || '';
                        updated.broughtBy = targetEntry.broughtBy || prev?.broughtBy || '';
                        updated.storeInchargeName = targetEntry.storeInchargeName || prev?.storeInchargeName || '';
                        updated.productLength = targetEntry.productLength || prev?.productLength || '';
                        updated.innerDiameter = targetEntry.innerDiameter || prev?.innerDiameter || '';
                        updated.kg = targetEntry.kg || prev?.kg || '';
                      }
                      return updated;
                    });
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Search Item (Code/Name)" fullWidth variant="outlined" size="small" />}
              />

              <TextField
                label="Product Name"
                size="small"
                fullWidth
                value={mobileEditingRow.materialName || ''}
                onChange={e => setMobileEditingRow(prev => ({ ...prev, materialName: e.target.value }))}
              />

              <TextField
                label="Bill Number"
                size="small"
                fullWidth
                value={mobileEditingRow.billNumber || ''}
                onChange={e => setMobileEditingRow(prev => ({ ...prev, billNumber: e.target.value }))}
              />

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label="Arrival Quantity"
                    type="number"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.arrivalQuantity || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, arrivalQuantity: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Outgoing Quantity (Out)"
                    type="number"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.outgoingQuantity || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, outgoingQuantity: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label="Store Arrival Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={mobileEditingRow.arrivalDate ? String(mobileEditingRow.arrivalDate).substring(0, 10) : ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, arrivalDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Arrival Time (HH:MM)"
                    size="small"
                    fullWidth
                    placeholder="10:30"
                    value={mobileEditingRow.arrivalTime || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label="Issue Date"
                    type="date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={mobileEditingRow.issueDate ? String(mobileEditingRow.issueDate).substring(0, 10) : ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, issueDate: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Issued By"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.issuedBy || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, issuedBy: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label="Lane Wala Name"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.broughtBy || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, broughtBy: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Store Incharge Name"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.storeInchargeName || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, storeInchargeName: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <TextField
                    label="Product Length"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.productLength || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, productLength: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Inner Diameter"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.innerDiameter || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, innerDiameter: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="KG"
                    size="small"
                    fullWidth
                    value={mobileEditingRow.kg || ''}
                    onChange={e => setMobileEditingRow(prev => ({ ...prev, kg: e.target.value }))}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMobileEditOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleMobileSave} variant="contained">Save Record</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
