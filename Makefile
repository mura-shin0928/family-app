.PHONY: db-reset

# ローカルSupabaseを起動し、このブランチのmigrationを全て当て直す。
db-reset:
	supabase start
	supabase db reset --local
