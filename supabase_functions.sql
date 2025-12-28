-- دالة لجلب جميع الجداول في schema public
-- نفذ هذا في Supabase SQL Editor لكل زبون

CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS TABLE(table_name text) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name::text
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;
$$;

-- منح صلاحية التنفيذ
GRANT EXECUTE ON FUNCTION get_all_tables() TO anon;
GRANT EXECUTE ON FUNCTION get_all_tables() TO authenticated;
