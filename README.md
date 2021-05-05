![npm](https://img.shields.io/npm/v/commont)

# useComments

React hook to effortlessly add a comment section to your website, and start the
discussion on your content.

# What is it?

### 🎃 Headless React Hook

`useComments` just cares about the data. You write your own UI.

---

**Create beautiful UI for your comments**

   Start off from one of the examples or write it from scratch.

   1. [Theme UI](https://codesandbox.io/s/use-comments-theme-ui-demo-hjqqj)

   2. [Tailwind](https://codesandbox.io/s/use-comments-demo-tailwind-pvhgw)

# API Reference

## `useComments`

Fetches comments from the backend on mount and whenever `config.take` or `config.skip` change.

### Parameters

- **projectId**: Your project ID
- **postId**: Comments will be fetched for the post with identifier `postId`
- **config**: Configurable offset and limit for the server request. See
  [`UseCommentsConfig`](#use-comments-config)

### TypeScript Signature

```ts
const useComments: (
  projectId: string,
  postId: string,
  config?: UseCommentsConfig | undefined
) => UseComentsResult;
```

### Returns `UseComentsResult`

```ts
interface UseComentsResult {
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
```

## `Comment`

```ts
export interface Comment {
  post_id: string;
  author: string;
  content: string;
  created_at: string;
  status?: CommentStatus;
}
```

## `UseCommentsConfig`

```ts
export interface UseCommentsConfig {
  take?: number;
  skip?: number;
}
```

## `CommentStatus`

When user is adding a new comment it will be in one of four states:

- `sending` — add comment request is still pending.
- `added` — the comment was successfully added and is visible for other people.
- `delivered-awaiting-approval` — the comment was successfully added, but it's
  not yet visible for other people. You can make comments to require approval
  before being visible to others.
- `failed` — adding a comment was unsuccessful.

```ts
export declare type CommentStatus =
  | 'sending'
  | 'added'
  | 'delivered-awaiting-approval'
  | 'failed';
```

## `UseCommentsError`

```ts
interface UseCommentsError {
  error: string;
  details: string;
}
```
