/* eslint-disable no-mixed-spaces-and-tabs */
import { useState, useEffect } from 'react';

export interface Comment {
	/** The string provided by the sender */
	author: string;
	content: string;
	created_at: string;
	/**
	 * Needed for optimistic update.
	 * When the comment is submitted, it is `'sending'`.
	 * When the request succeeds and the comment is not hidden in the database, it turns into `'added'`.
	 * When the request succeeds and the comment is hidden and awaiting approval, we receive `'delivered-awaiting-approval'`.
	 * When the request fails, the status is `'failed'`. - You can use this information to prompt user to retry.
	 */
	status?: CommentStatus;
}

interface CommentInternal extends Comment {
	post_id: string;
}

/**
 * Needed for optimistic update.
 * When the comment is submitted, it is `'sending'`.
 * When the request succeeds and the comment is not hidden in the database, it turns into `'added'`.
 * When the request succeeds and the comment is hidden and awaiting approval, we receive `'delivered-awaiting-approval'`.
 * When the request fails, the status is `'failed'`. - You can use this information to prompt user to retry.
 */
export type CommentStatus =
	| 'sending'
	| 'added'
	| 'delivered-awaiting-approval'
	| 'failed';

const errorMessage =
	'Oops! Fetching comments was unsuccessful. Try again later.';

export interface UseCommentsError {
	error: string;
	details: string;
}

export interface UseCommentsConfig {
	take?: number;
	skip?: number;
}

export interface UseComentsResult {
	comments: Comment[];
	addComment: ({
		content,
		author,
	}: Pick<Comment, 'content' | 'author'>) => void;
	refetch: () => void;
	count: number;
	loading: boolean;
	error: UseCommentsError | null;
}

const URL = '';

/**
 * Fetches comments from Hasura backend specified in `hasuraUrl` on mount and whenever
 * `config.take` or `config.skip` change.
 *
 * @param projectId Id of your Commont's project
 * @param postId Comments will be fetched for the post with id `postId`
 * @param config Configurable skip and take for the GraphQL query to Hasura
 * @returns comments for given post, aggregated count of all comments, error,
 *          loading state and a function to refetch data from backend.
 */
export const useComments = (
	projectId: string,
	postId: string,
	config?: UseCommentsConfig
): UseComentsResult => {
	const [comments, setComments] = useState<Comment[]>([]);
	const [count, setCount] = useState(0);
	const [error, setError] = useState<UseCommentsError | null>(null);
	const [loading, setLoading] = useState(false);

	const fetchComments = () => {
		setLoading(true);
		fetch(URL, {
			method: 'POST',
			body: JSON.stringify({
				projectId,
				postId,
				...(config?.take && { take: config.take }),
				...(config?.skip && { skip: config.skip }),
			}),
		})
			.then(res => res.json())
			.then(res => {
				setComments(res.comments);
				setCount(res.count);
				setLoading(false);
			})
			.catch(err => {
				setError({
					error: errorMessage,
					details: err,
				});
				setLoading(false);
			});
	};

	useEffect(fetchComments, [config?.take, config?.skip]);

	const addComment = ({
		content,
		author,
	}: Pick<Comment, 'content' | 'author'>) => {
		const createdAt = new Date().toDateString();

		const newComment: CommentInternal = {
			author,
			content,
			post_id: postId,
			created_at: createdAt,
			status: 'sending',
		};
		setComments(prev => [newComment, ...prev]);
		setCount(prev => ++prev);

		fetch(URL, {
			method: 'POST',
			body: JSON.stringify({
				projectId,
				postId,
				content,
				author,
			}),
		})
			.then(res => res.json())
			.then(res => {
				const remoteComment = res.data.insert_comments_one;
				setComments(prev =>
					prev.map(
						(x): Comment =>
							x === newComment
								? {
										...remoteComment,
										status: remoteComment.hidden
											? 'delivered-awaiting-approval'
											: 'added',
								  }
								: x
					)
				);
			})
			.catch(err => {
				setError({
					error: errorMessage,
					details: err,
				});
				setComments(prev =>
					prev.map(
						(x): Comment =>
							x === newComment
								? {
										...newComment,
										status: 'failed',
								  }
								: x
					)
				);
			});
	};

	return {
		comments,
		addComment,
		refetch: fetchComments,
		count,
		loading,
		error,
	};
};
