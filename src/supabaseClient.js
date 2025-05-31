// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uhzxbeusepqzwysxboqk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoenhiZXVzZXBxend5c3hib3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNzQwODIsImV4cCI6MjA2Mzk1MDA4Mn0.Lmmxf8KkK4XDEKC2BLvenhyuVGly5lv4iD87h0teWiE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
