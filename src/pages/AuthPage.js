import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const navigate = useNavigate();

  const SECRET_ADMIN_CODE = 'Admin2025Bolzoo'; // Replace with your real secret code

  // Calculate age from birthdate
  function calculateAge(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Check if username is unique
  const isUsernameUnique = async (name) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', name)
      .single();
    return !data; // unique if no data found
  };

  // Fetch state and country from user location
  async function fetchUserLocationStateCountry() {
    if (!navigator.geolocation) {
      alert('Your browser does not support geolocation.');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          const state = data.address.state || data.address.county || '';
          const country = data.address.country || '';

          if (state || country) {
            const parts = [state, country].filter(Boolean);
            setLocation(parts.join(', '));
          } else {
            setLocation('');
            alert('Unable to detect state/country from your location.');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          alert('Failed to detect your location.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        alert('Geolocation permission denied or unavailable.');
        setLocationLoading(false);
      }
    );
  }

  // Auto fetch location when switching to sign-up
  useEffect(() => {
    if (isSigningUp) {
      if (!location) {
        fetchUserLocationStateCountry();
      }
    } else {
      setLocation('');
      setLocationLoading(false);
    }
  }, [isSigningUp]);

  const handleAuth = async () => {
    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    if (isSigningUp) {
      if (
        !username.trim() ||
        !nickname.trim() ||
        !birthdate ||
        !gender ||
        !phoneNumber.trim()
      ) {
        alert('Админ кодноос бусад бүгдийг бөглөнө үү, баярлалаа.');
        return;
      }

      const age = calculateAge(birthdate);
      if (age < 12) {
        alert('Таны нас 12-оос доош байна. Бүртгүүлэх боломжгүй.');
        return;
      }

      const unique = await isUsernameUnique(username.trim());
      if (!unique) {
        alert('Username is already taken. Please choose another.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      const userId = data.user?.id;
      const userEmail = data.user?.email;

      if (userId && userEmail) {
        const isAdmin = adminCode.trim() === SECRET_ADMIN_CODE;

        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          email: userEmail,
          username: username.trim(),
          nickname: nickname.trim(),
          birthdate: birthdate,
          gender: gender,
          phone_number: phoneNumber.trim(),
          location: location.trim(),
          is_admin: isAdmin,
        });

        if (profileError) {
          alert(profileError.message);
          return;
        }

        navigate('/profile');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      navigate('/profile');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
      <h2>{isSigningUp ? 'Sign Up' : 'Log In'}</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: '0.5rem', width: '100%' }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: '0.5rem', width: '100%' }}
      />

      {isSigningUp && (
        <>
          <input
            type="tel"
            placeholder="Утасны дугаар"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
            required
          />

          <input
            type="text"
            placeholder="Username (Ганц өгөөл ахиж солигдохгүй)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
            required
          />

          <input
            type="text"
            placeholder="Nickname (дараа сольж болно)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
            required
          />

          <label>Төрсөн өдөр:</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
            required
          />

          <label>Хүйс:</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
            required
          >
            <option value="">Хүйсээ сонгоно уу</option>
            <option value="Эрэгтэй">Эрэгтэй</option>
            <option value="Эмэгтэй">Эмэгтэй</option>
          </select>

          <label>Байршил (автомат илрүүлсэн):</label>
          <input
            type="text"
            value={locationLoading ? 'Байршил илэрч байна...' : location}
            readOnly
            style={{ marginBottom: '0.5rem', width: '100%', backgroundColor: '#f0f0f0' }}
            required
          />

          <input
            type="text"
            placeholder="Admin Code (Та админ бол оруулна.)"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
          />
        </>
      )}

      <button onClick={handleAuth} style={{ width: '100%', marginBottom: '1rem' }}>
        {isSigningUp ? 'Бүртгүүлэх' : 'Нэвтрэх'}
      </button>

      <p
        onClick={() => setIsSigningUp(!isSigningUp)}
        style={{ cursor: 'pointer', color: 'blue', textAlign: 'center' }}
      >
        {isSigningUp ? 'Өөр акк байгаа? Нэвтрэх' : 'Анх удаа? Бүртгүүлэх'}
      </p>
    </div>
  );
}
