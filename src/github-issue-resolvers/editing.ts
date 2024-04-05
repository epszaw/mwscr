import { getLocations } from '../data-managers/locations.js';
import { getPost, inbox, trash } from '../data-managers/posts.js';
import type { GithubIssue } from '../entities/github-issue-resolver.js';
import type { Post, PostViolation } from '../entities/post.js';
import {
  mergeAuthors,
  mergePostContents,
  POST_ADDONS,
  POST_ENGINES,
  POST_MARKS,
  POST_TYPES,
  POST_VIOLATIONS,
} from '../entities/post.js';
import { asArray } from '../utils/common-utils.js';
import {
  postAddon,
  postAuthor,
  postContent,
  postEngine,
  postLocation,
  postMark,
  postRequestText,
  postTags,
  postTitle,
  postTitleRu,
  postTrash,
  postType,
  postViolation,
} from './utils/issue-fields.js';
import {
  extractIssueFieldValue,
  extractIssueTextareaValue,
  extractIssueUser,
  issueDropdownToInput,
} from './utils/issue-utils.js';

export const label = 'editing';

const DEFAULT_TITLE = 'POST_ID';

export async function resolve(issue: GithubIssue) {
  const id = issue.title;
  const [post, manager] = await getPost(id, [inbox, trash]);
  const [userId, user] = await extractIssueUser(issue);

  if (!user.admin) {
    throw new Error(`Post ${label} is not allowed for non-administrator user "${userId}".`);
  }

  const typeStr = extractIssueFieldValue(postType, issue.body);
  const engineStr = extractIssueFieldValue(postEngine, issue.body);
  const addonStr = extractIssueFieldValue(postAddon, issue.body);
  const markStr = extractIssueFieldValue(postMark, issue.body);
  const violationStr = extractIssueFieldValue(postViolation, issue.body);
  const location = extractIssueFieldValue(postLocation, issue.body);
  const requestText = extractIssueFieldValue(postRequestText, issue.body);
  const rawContent = extractIssueTextareaValue(postContent, issue.body)?.split(/\r?\n/).filter(Boolean);
  const rawTrash = extractIssueTextareaValue(postTrash, issue.body)?.split(/\r?\n/).filter(Boolean);
  const oldContent = post.content;
  const oldTrash = post.trash;

  post.title = extractIssueFieldValue(postTitle, issue.body);
  post.titleRu = extractIssueFieldValue(postTitleRu, issue.body);
  post.content = mergePostContents(
    rawContent,
    asArray(oldTrash).filter((url) => !rawTrash?.includes(url)),
  );
  post.trash = mergePostContents(
    rawTrash,
    asArray(oldContent).filter((url) => !rawContent?.includes(url)),
  );
  post.author = mergeAuthors(extractIssueFieldValue(postAuthor, issue.body)?.split(/\s+/).filter(Boolean));
  post.type = POST_TYPES.find((type) => type === typeStr) ?? 'shot';
  post.tags = extractIssueFieldValue(postTags, issue.body)?.split(/\s+/).filter(Boolean);
  post.engine = POST_ENGINES.find((engine) => engine === engineStr);
  post.addon = POST_ADDONS.find((addon) => addon === addonStr);
  post.mark = POST_MARKS.find((mark) => mark === markStr);
  post.violation = [...Object.entries(POST_VIOLATIONS)].find(
    ([, title]) => title === violationStr,
  )?.[0] as PostViolation;

  if (!location) {
    post.location = location;
  } else {
    const locations = await getLocations();
    if (locations.includes(location)) {
      post.location = location;
    }
  }

  if (post.request && requestText) {
    post.request.text = requestText;
  }

  await manager.updatePost(id);

  console.info(`Post "${id}" updated".`);
}

export async function createIssueTemplate() {
  return {
    name: 'Edit Post',
    description: 'Paste in the title the ID of post from inbox or trash.',
    title: DEFAULT_TITLE,
    labels: [label],
    body: [
      postContent,
      postTitle,
      postTitleRu,
      issueDropdownToInput(postType),
      postAuthor,
      issueDropdownToInput(postEngine),
      issueDropdownToInput(postAddon),
      postTags,
      issueDropdownToInput(postLocation),
      issueDropdownToInput(postMark),
      issueDropdownToInput(postViolation),
      postTrash,
      postRequestText,
    ],
  };
}

export function createIssueUrl(id?: string, post?: Post): string {
  const url = new URL('https://github.com/dehero/mwscr/issues/new');
  url.searchParams.set('labels', label);
  url.searchParams.set('template', `${label}.yml`);
  url.searchParams.set('title', id || DEFAULT_TITLE);
  url.searchParams.set(postContent.id, asArray(post?.content).join('\n'));
  url.searchParams.set(postTitle.id, post?.title || '');
  url.searchParams.set(postTitleRu.id, post?.titleRu || '');
  url.searchParams.set(postAuthor.id, asArray(post?.author).join(' '));
  url.searchParams.set(postType.id, post?.type || 'shot');
  url.searchParams.set(postEngine.id, post?.engine || '');
  url.searchParams.set(postAddon.id, post?.addon || '');
  url.searchParams.set(postTags.id, post?.tags?.join(' ') || '');
  url.searchParams.set(postLocation.id, post?.location || '');
  url.searchParams.set(postMark.id, post?.mark || '');
  url.searchParams.set(postViolation.id, post?.violation || '');
  url.searchParams.set(postTrash.id, asArray(post?.trash).join('\n'));
  url.searchParams.set(postRequestText.id, post?.request?.text || '');

  return url.toString();
}
