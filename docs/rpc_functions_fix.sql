/*
  RPC FUNCTIONS TO BYPASS RLS ISSUES
  
  Run this SQL in your Supabase SQL Editor.
  This creates database functions that handle deletions properly.
*/

-- Function to soft delete a comment
CREATE OR REPLACE FUNCTION soft_delete_comment(comment_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data json;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update the comment if the user is the author
    UPDATE public.comments 
    SET deleted = true
    WHERE id = comment_id 
    AND author_id = current_user_id 
    AND deleted = false
    RETURNING to_json(comments.*) INTO result_data;
    
    -- Check if any row was updated
    IF result_data IS NULL THEN
        RAISE EXCEPTION 'Comment not found or you are not the author';
    END IF;
    
    RETURN result_data;
END;
$$;

-- Function to soft delete a post
CREATE OR REPLACE FUNCTION soft_delete_post(post_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data json;
    current_user_id uuid;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Update the post if the user is the author
    UPDATE public.posts 
    SET hidden = true
    WHERE id = post_id 
    AND author_id = current_user_id 
    AND hidden = false
    RETURNING to_json(posts.*) INTO result_data;
    
    -- Check if any row was updated
    IF result_data IS NULL THEN
        RAISE EXCEPTION 'Post not found or you are not the author';
    END IF;
    
    RETURN result_data;
END;
$$;