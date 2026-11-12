-- Web 検索（Tavily）は準備の提案に置き換えたので、回数の枠を消す。
drop function public.consume_web_search_quota();
drop table public.web_search_usage;
