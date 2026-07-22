import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel, Autocomplete } from '@mui/material';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [country] = useState('India');
  const [stateId, setStateId] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [loginType, setLoginType] = useState('Admin Login');
  
  const [userId, setUserId] = useState('@finsen-admin');
  const [password, setPassword] = useState('7Finsenxyz#');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch locations for the dropdown
    api.get('/api/v1/locations')
      .then(res => setLocations(res.data))
      .catch(err => console.error('Failed to fetch locations', err));
  }, []);

  const handleLoginTypeChange = (e) => {
    const type = e.target.value;
    setLoginType(type);
    if (type === 'Admin Login') {
      setUserId('@finsen-admin');
      setPassword('7Finsenxyz#');
    } else if (type === 'Store Incharge Login') {
      setUserId('storeadmin');
      setPassword('store123');
    } else {
      setUserId('@finsen-user');
      setPassword('7Userzyx#');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!stateId) {
      setError('Please select a valid State/Location.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', { userId: userId, password: password });
      
      if (response.data.token) {
        let finalLocation = locations.find(l => l.id === stateId);
        
        // If normal user, force their location to their assigned location from backend
        if (response.data.role !== 'SUPER_ADMIN') {
            if (!response.data.locationId) {
                setError('Your account is not assigned to any state. Contact Admin.');
                setLoading(false);
                return;
            }
            finalLocation = locations.find(l => l.id === response.data.locationId);
        }

        login(response.data.token, { 
          user_id: response.data.userId, 
          name: response.data.fullName, 
          role: response.data.role,
          location: finalLocation?.name,
          locationId: finalLocation?.id
        });
        
        // Also update the store's selectedLocation right away
        useAuthStore.getState().updateLocation(finalLocation);
        
        navigate('/entry-book');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0B4F6C 0%, #01BAEF 100%)',
        padding: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" justifyContent="center" mb={2}>
            <img src="/logo.svg" alt="Finsen Ritter Logo" style={{ width: '80px', height: '80px' }} />
          </Box>
          <Typography variant="h5" align="center" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
            Finsen Ritter Limited
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Country"
              variant="outlined"
              margin="normal"
              value={country}
              disabled
            />
            
            <FormControl fullWidth margin="normal">
              <Autocomplete
                options={locations}
                getOptionLabel={(option) => option.name}
                value={locations.find(l => l.id === stateId) || null}
                onChange={(event, newValue) => {
                  setStateId(newValue ? newValue.id : '');
                }}
                renderInput={(params) => <TextField {...params} label="State (Location)" required />}
              />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Login Type</InputLabel>
              <Select
                value={loginType}
                label="Login Type"
                onChange={handleLoginTypeChange}
              >
                <MenuItem value="Admin Login">Admin Login</MenuItem>
                <MenuItem value="Store Incharge Login">Store Incharge Login</MenuItem>
                <MenuItem value="User Login">User Login (View Only)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="User ID"
              variant="outlined"
              margin="normal"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
