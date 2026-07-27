DO $$
BEGIN
  IF to_regprocedure('public.unaccent(text)') IS NULL
    AND NOT has_database_privilege(current_user, current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'animal list accent search capability blocker: role % cannot create public.unaccent', current_user;
  END IF;
END
$$;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
--> statement-breakpoint
DO $$
BEGIN
  IF to_regprocedure('public.unaccent(text)') IS NULL THEN
    RAISE EXCEPTION 'animal list accent search capability blocker: public.unaccent(text) is unavailable';
  END IF;

  IF NOT has_function_privilege(current_user, 'public.unaccent(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'animal list accent search capability blocker: role % cannot execute public.unaccent(text)', current_user;
  END IF;

  PERFORM public.unaccent('Árbol');
EXCEPTION
  WHEN insufficient_privilege OR undefined_function THEN
    RAISE EXCEPTION 'animal list accent search capability blocker: public.unaccent(text) cannot be invoked by role %', current_user;
END
$$;
