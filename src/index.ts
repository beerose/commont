/* eslint-disable no-mixed-spaces-and-tabs */
import { useState, useEffect, useRef } from 'react';

export interface Comment {
  author: string;
  content: string;
  topic: string;
  createdAt: string;
  status?: CommontStatus;
}

interface InternalComment extends Comment {
  hidden: boolean;
}

/**
 * Needed for optimistic update.
 * When the comment is submitted, it is `'sending'`.
 * When the request succeeds and the comment is not hidden in the database, it turns into `'added'`.
 * When the request succeeds and the comment is hidden and awaiting approval, we receive `'delivered-awaiting-approval'`.
 * When the request fails, the status is `'failed'`. - You can use this information to prompt user to retry.
 */
export type CommontStatus =
  | 'sending'
  | 'added'
  | 'delivered-awaiting-approval'
  | 'failed';

export interface UseCommentsParameters {
  projectId: string;
  topic: string;
  take?: number;
  skip?: number;
}

export interface UseCommentsResult {
  comments: Comment[];
  addComment: ({
    content,
    author,
  }: Pick<Comment, 'content' | 'author'>) => void;
  refetch: () => void;
  count: number;
  loading: boolean;
  error: string | null;
}

const _fetchComments = async (payload: Record<string, any>) => {
  const params = new URLSearchParams(payload).toString();
  const url = `https://www.commont.app/api/comments?${params}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const responseJson: {
    comments: Comment[];
    count: number;
  } = await response.json();

  if (response.ok) {
    return responseJson;
  }

  if (response.ok) {
    return responseJson
      ? responseJson
      : Promise.reject(new Error('Empty API response'));
  }

  return Promise.reject(new Error(response.statusText));
};

const _addComment = async (payload: Record<string, string>) => {
  const response = await fetch('https://www.commont.app/api/add-comment', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const responseJson: { comment: InternalComment } = await response.json();

  if (response.ok) {
    return responseJson
      ? responseJson
      : Promise.reject(new Error('Empty API response'));
  }

  return Promise.reject(new Error(response.statusText));
};

/**
 * Fetches comments from Hasura backend specified in `hasuraUrl` on mount and whenever
 * `config.take` or `config.skip` change.
 *
 * @param projectId Id of your Commont's project
 * @param topic Comments will be fetched for the post with id `topic`
 * @param config Configurable skip and take for the GraphQL query to Hasura
 * @returns comments for given post, aggregated count of all comments, error,
 *          loading state and a function to refetch data from backend.
 */
export const useComments = ({
  projectId,
  topic,
  skip,
  take,
}: UseCommentsParameters): UseCommentsResult => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isMounted = useIsMounted();

  const fetchComments = () => {
    if (isMounted) {
      setLoading(true);
    }
    _fetchComments({
      projectId,
      topic,
      ...(take && { take }),
      ...(skip && { skip }),
    })
      .then(res => {
        if (isMounted) {
          setComments(res.comments);
          setCount(res.count);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });
  };

  useEffect(fetchComments, [take, skip]);

  const addComment = ({
    content,
    author,
  }: Pick<Comment, 'content' | 'author'>) => {
    const createdAt = new Date().toDateString();

    const newComment: Comment = {
      author,
      content,
      topic,
      createdAt,
      status: 'sending',
    };
    if (isMounted) {
      setComments(prev => [newComment, ...prev]);
      setCount(prev => ++prev);
    }

    _addComment({
      projectId,
      topic,
      content,
      author,
    })
      .then(res => {
        const remoteComment = res.comment;
        if (isMounted) {
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
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
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
        }
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

const useIsMounted = () => {
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  });
  return isMounted;
};
