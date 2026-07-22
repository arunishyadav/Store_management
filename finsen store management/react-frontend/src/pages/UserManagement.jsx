import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Alert, Autocomplete } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // New/Edit user form state
  const [userForm, setUserForm] = useState({ userId: '', email: '', password: '', fullName: '', role: 'USER', locationId: '', active: true });
  const [error, setError] = useState('');

  const currentLocation = useAuthStore(state => state.selectedLocation);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    fetchData();
    api.get('/api/v1/locations').then(res => setLocations(res.data)).catch(err => console.error("Error fetching locations:", err));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // The backend now returns all users for SUPER_ADMIN when locationId is omitted.
      const userRes = await api.get(`/api/v1/users`);
      setUsers(userRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setIsEditing(true);
      setSelectedUser(user);
      setUserForm({
        userId: user.userId,
        password: user.password || '', // Visible password comes from backend DTO now
        email: user.email || '',
        fullName: user.fullName,
        role: user.role,
        locationId: user.locationId || '',
        active: user.active
      });
    } else {
      setIsEditing(false);
      setSelectedUser(null);
      setUserForm({ userId: '', email: '', password: '', fullName: '', role: 'USER', locationId: currentLocation.id, active: true });
    }
    setOpenUserDialog(true);
    setError('');
  };

  const handleSaveUser = async () => {
    try {
      if (isEditing) {
        await api.put(`/api/v1/users/${selectedUser.id}`, userForm);
      } else {
        await api.post('/api/v1/users', userForm);
      }
      setOpenUserDialog(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} user`);
    }
  };

  const columns = [
    { field: 'userId', headerName: 'User ID', width: 150 },
    { field: 'fullName', headerName: 'Full Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 180 },
    { field: 'password', headerName: 'Password', width: 120 }, // Added Password column
    { 
      field: 'role', 
      headerName: 'Role', 
      width: 250, 
      renderCell: (params) => {
        if (params.value === 'USER') return 'Viewer (Only View)';
        if (params.value === 'STORE_INCHARGE') return 'Store Incharge (Add/Edit Entries)';
        if (params.value === 'SUPER_ADMIN') return 'Admin (Full Access)';
        return params.value;
      }
    },
    { field: 'locationName', headerName: 'Assigned State', width: 180 },
    { field: 'active', headerName: 'Status', width: 100, renderCell: (params) => params.value ? 'Active' : 'Inactive' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => handleOpenDialog(params.row)}
        >
          Edit
        </Button>
      )
    }
  ];

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return <Typography color="error" variant="h6">Access Denied</Typography>;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ px: { xs: 2, sm: 0 }, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>User Management (Global)</Typography>
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
            Add User
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mx: { xs: 2, sm: 0 }, mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', flexGrow: 1, borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <DataGrid rows={users} columns={columns} density="comfortable" sx={{ border: 'none' }} />
          </Box>
        )}
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)}>
        <DialogTitle>{isEditing ? 'Edit User' : `Add New User`}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
          
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={userForm.role} label="Role" onChange={(e) => setUserForm({...userForm, role: e.target.value})}>
              <MenuItem value="USER">Viewer (Only View)</MenuItem>
              <MenuItem value="STORE_INCHARGE">Store Incharge (Add/Edit Entries)</MenuItem>
              <MenuItem value="SUPER_ADMIN">Admin (Full Access)</MenuItem>
            </Select>
          </FormControl>
          
          {userForm.role !== 'SUPER_ADMIN' && (
            <FormControl fullWidth>
              <Autocomplete
                options={locations}
                getOptionLabel={(option) => option.name}
                value={locations.find(l => l.id === userForm.locationId) || null}
                onChange={(event, newValue) => {
                  setUserForm({...userForm, locationId: newValue ? newValue.id : ''});
                }}
                renderInput={(params) => <TextField {...params} label="Assigned State (Location)" />}
              />
            </FormControl>
          )}

          <TextField label="User ID" value={userForm.userId} onChange={(e) => setUserForm({...userForm, userId: e.target.value})} fullWidth />
          <TextField label="Full Name" value={userForm.fullName} onChange={(e) => setUserForm({...userForm, fullName: e.target.value})} fullWidth />
          <TextField label="Email Address (For Alerts)" type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} fullWidth />
          <TextField 
            label={isEditing ? "Password (Leave blank to keep unchanged)" : "Password"} 
            type="text" 
            value={userForm.password} 
            onChange={(e) => setUserForm({...userForm, password: e.target.value})} 
            fullWidth 
          />
          {isEditing && (
             <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={userForm.active ? "true" : "false"} label="Status" onChange={(e) => setUserForm({...userForm, active: e.target.value === "true"})}>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
             </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>{isEditing ? 'Save Changes' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
