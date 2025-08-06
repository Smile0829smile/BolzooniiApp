import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');


  // Check username uniqueness before signup
  const isUsernameUnique = async (name) => {
    const { data} = await supabase
      .from('profiles')
      .select('id')
      .eq('username', name)
      .single();
    return !data; // no user found = unique
  };

  const handleAuth = async () => {
    if (!email || !password || (isSigningUp && !username)) {
      alert('Please fill all required fields (email, password, username).');
      return;
    }

    if (isSigningUp) {
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
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          email: userEmail,
          username: username.trim(),
          nickname: nickname.trim() || '',
          birthdate: birthdate || null,
          gender: gender || null,
          phone_number: phoneNumber,
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
          />
          <input
            type="text"
            placeholder="Username (Ганц өгөөл ахиж солигдохгүй)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
          />
          <input
            type="text"
            placeholder="Nickname (дараа сольж болно)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
          />
          <label>Төрсөн өдөр:</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            style={{ marginBottom: '0.5rem', width: '100%' }}
          />
          <label>Хүйс:</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{ marginBottom: '1rem', width: '100%' }}
          >
            <option value="">Хүйсээ сонгоно уу</option>
            <option value="Эрэгтэй">Эрэгтэй</option>
            <option value="Эмэгтэй">Эмэгтэй</option>
          </select>
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
