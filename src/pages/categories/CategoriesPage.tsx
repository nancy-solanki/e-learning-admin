import { Input, Textarea, Field } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CategoryIcon,
  SearchIcon,
  TrashIcon,
  CloseIcon,
} from '../../components/icons/AdminIcons';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { apiErrorMessage, apiFieldErrors } from '../../lib/api';
import {
  deleteCategory,
  getCategory,
  listCategories,
  saveCategory,
  type Category,
  type CategoryPage,
} from '../../lib/categories';
import './categories.css';

function Thumbnail({ category }: { category: Category }) {
  const [failed, setFailed] = useState(false);
  return category.thumbnail?.url && !failed ? (
    <img src={category.thumbnail.url} alt="" onError={() => setFailed(true)} />
  ) : (
    <CategoryIcon className="h-12 w-12 text-violet-300" />
  );
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: (category: Category) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(category?.title ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  function choose(files: File[]) {
    if (pending) return;
    const selected = files[0];
    if (!selected) return;
    const message =
      files.length > 1
        ? 'Please select one image.'
        : !selected.type.startsWith('image/')
          ? 'Please choose an image file.'
          : selected.size > 5 * 1024 * 1024
            ? 'Choose an image smaller than 5 MB.'
            : '';
    setErrors((current) => ({ ...current, thumbnail: message }));
    if (!message) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const validation: Record<string, string> = {};
    if (!title.trim()) validation.title = 'Enter a category title.';
    if (!description.trim()) validation.description = 'Add a description.';
    if (!category && !file) validation.thumbnail = 'Add a thumbnail image.';
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setPending(true);
    setError('');
    const body = new FormData();
    body.append('title', title.trim());
    body.append('description', description.trim());
    if (file) body.append('thumbnail', file);
    try {
      onSaved(await saveCategory(body, category?.slug));
    } catch (failure) {
      setErrors(apiFieldErrors(failure));
      setError(
        apiErrorMessage(
          failure,
          'Unable to save this category. Please try again.',
        ),
      );
    } finally {
      setPending(false);
    }
  }
  const image = file ? preview : category?.thumbnail?.url;
  return (
    <dialog
      ref={dialog}
      className="category-dialog"
      aria-labelledby="category-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header className="category-dialog-heading">
          <div>
            <h2 id="category-editor-title">
              {category ? 'Edit category' : 'Create a category'}
            </h2>
            <p>Add a title, description, and thumbnail.</p>
          </div>
          <button
            type="button"
            className="category-icon-button"
            aria-label="Close editor"
            disabled={pending}
            onClick={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <fieldset disabled={pending} className="category-form">
          <Field
            label="Category title"
            htmlFor="category-title"
            required
            error={errors.title}
          >
            <Input
              autoFocus
              id="category-title"
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design & creativity"
              aria-invalid={!!errors.title}
              aria-describedby="category-title-help"
            />
          </Field>
          <Field
            label="Description"
            htmlFor="category-description"
            required
            error={errors.description}
          >
            <Textarea
              id="category-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will learners discover in this category?"
              aria-invalid={!!errors.description}
              aria-describedby="category-description-help"
            />
          </Field>
          <label htmlFor="category-file">
            Thumbnail {!category && <span>*</span>}
          </label>
          <div
            className={`category-dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!pending) setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(Array.from(e.dataTransfer.files));
            }}
          >
            {image ? (
              <img
                className="category-upload-preview"
                src={image}
                alt="Thumbnail preview"
              />
            ) : (
              <span className="category-upload-icon" aria-hidden="true">
                ↑
              </span>
            )}
            <button
              type="button"
              className="category-upload-button"
              onClick={() => input.current?.click()}
            >
              {image ? 'Choose a different image' : 'Click to upload'}
              <span> or drag and drop</span>
            </button>
            <p>{file ? file.name : 'Image files · Up to 5 MB'}</p>
            {file && (
              <button
                type="button"
                className="category-text-button"
                onClick={() => {
                  setFile(null);
                  setPreview('');
                  if (input.current) input.current.value = '';
                }}
              >
                Remove selected image
              </button>
            )}
            <input
              ref={input}
              id="category-file"
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload thumbnail"
              aria-describedby="thumbnail-error"
              onChange={(e) => {
                choose(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </div>
          {errors.thumbnail && (
            <p
              id="thumbnail-error"
              role="alert"
              className="category-field-error"
            >
              {errors.thumbnail}
            </p>
          )}
          {error && (
            <p role="alert" className="category-error">
              {error}
            </p>
          )}
        </fieldset>
        <footer className="category-dialog-footer">
          <button
            type="button"
            className="category-secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="category-primary" disabled={pending}>
            {pending
              ? 'Saving…'
              : category
                ? 'Save changes'
                : 'Create category'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CategoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{ category: Category | null } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return;
        setLoading(true);
        setError('');
        return listCategories(
          { search: query, ordering, page, page_size: 9 },
          controller.signal,
        );
      })
      .then((result) => {
        if (!controller.signal.aborted && result) setData(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            apiErrorMessage(
              failure,
              'Unable to load categories. Please try again.',
            ),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, ordering, page, revision]);
  async function edit(category: Category) {
    setOpening(category.id);
    setNotice('');
    try {
      setEditor({ category: await getCategory(category.slug) });
    } catch (failure) {
      setNotice(
        apiErrorMessage(
          failure,
          'Unable to open this category. Please try again.',
        ),
      );
    } finally {
      setOpening(null);
    }
  }
  async function remove() {
    if (!deleting || pendingDelete) return;
    setPendingDelete(true);
    setDeleteError('');
    try {
      await deleteCategory(deleting.slug);
      setNotice(`“${deleting.title}” was deleted.`);
      setDeleting(null);
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else setRevision((v) => v + 1);
    } catch (failure) {
      setDeleteError(
        apiErrorMessage(
          failure,
          'Unable to delete this category. Please try again.',
        ),
      );
    } finally {
      setPendingDelete(false);
    }
  }
  return (
    <section className="categories-page">
      <div className="category-page-heading">
        <div>
          <span className="category-eyebrow">YOUR LEARNING LIBRARY</span>
          <h1>
            Categories<span className="category-heading-dot">.</span>
          </h1>
          <p>Thoughtful collections. Endless possibilities.</p>
        </div>
        <button
          className="category-primary"
          onClick={() => {
            setNotice('');
            setEditor({ category: null });
          }}
        >
          <span aria-hidden="true">＋</span> Create category
        </button>
      </div>
      <div className="category-banner">
        <div className="category-banner-icon">
          <CategoryIcon className="h-7 w-7" />
        </div>
        <div>
          <h2>Great learning starts with discovery</h2>
          <p>
            Organize your courses into thoughtful collections that help learners
            find their next step.
          </p>
        </div>
        <span className="category-banner-label">
          A SPACE FOR EVERY INTEREST
        </span>
      </div>
      {notice && (
        <div role="status" className="category-notice">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="category-toolbar">
        <h2>
          All categories <span>{data ? data.count : '—'}</span>
        </h2>
        <div className="category-controls">
          <div className="category-search">
            <SearchIcon className="h-4 w-4" />
            <Input
              aria-label="Search categories"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Search categories…"
            />
          </div>
          <Select
            label="Sort categories"
            value={ordering}
            onChange={(value) => {
              setOrdering(value);
              setPage(1);
            }}
            options={[
              {
                value: '-created_at',
                label: 'Newest first',
                description: 'Recently added collections',
              },
              {
                value: 'created_at',
                label: 'Oldest first',
                description: 'Your earliest collections',
              },
              { value: 'title', label: 'Title: A–Z' },
              { value: '-title', label: 'Title: Z–A' },
            ]}
          />
        </div>
      </div>
      {loading ? (
        <div
          role="status"
          aria-label="Loading categories"
          className="category-grid"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="category-skeleton">
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="category-empty" role="alert">
          <h2>We couldn’t load your categories</h2>
          <p>{error}</p>
          <button
            className="category-secondary"
            onClick={() => setRevision((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      ) : !data?.results.length ? (
        <div className="category-empty">
          <CategoryIcon className="mx-auto h-12 w-12 text-violet-300" />
          <h2>
            {query ? 'No matching categories' : 'Make room for something great'}
          </h2>
          <p>
            {query
              ? 'Try a different title, keyword, or description.'
              : 'Create your first category and start organizing your learning library.'}
          </p>
          <button
            className="category-primary"
            onClick={() =>
              query ? setSearch('') : setEditor({ category: null })
            }
          >
            {query ? 'Clear search' : 'Create your first category'}
          </button>
        </div>
      ) : (
        <>
          <div className="category-grid">
            {data.results.map((category) => (
              <article className="category-card" key={category.id}>
                <div className="category-card-image">
                  <Thumbnail
                    key={category.thumbnail?.url}
                    category={category}
                  />
                  <span className="category-image-label">COLLECTION</span>
                </div>
                <div className="category-card-body">
                  <h3>{category.title}</h3>
                  <p className="category-slug">/{category.slug}</p>
                  <p className="category-description">{category.description}</p>
                </div>
                <footer>
                  <span>
                    {category.created_at
                      ? new Date(category.created_at).toLocaleDateString(
                          undefined,
                          { month: 'short', day: 'numeric', year: 'numeric' },
                        )
                      : 'Date unavailable'}
                  </span>
                  <div>
                    <button
                      className="category-edit"
                      disabled={opening !== null}
                      onClick={() => void edit(category)}
                      aria-label={`Edit ${category.title}`}
                    >
                      {opening === category.id ? 'Opening…' : 'Edit category'}{' '}
                      <span aria-hidden="true">↗</span>
                    </button>
                    <button
                      className="category-icon-button category-delete"
                      aria-label={`Delete ${category.title}`}
                      onClick={() => {
                        setDeleteError('');
                        setDeleting(category);
                      }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
          <div className="category-pagination">
            <p>
              Showing {(page - 1) * 9 + 1}–{Math.min(page * 9, data.count)} of{' '}
              {data.count} categories
            </p>
            <div>
              <button
                className="category-secondary"
                disabled={!data.previous}
                onClick={() => setPage((v) => v - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, Math.ceil(data.count / 9))}
              </span>
              <button
                className="category-secondary"
                disabled={!data.next}
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {editor && (
        <CategoryEditor
          category={editor.category}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setNotice(
              `“${saved.title}” was ${editor.category ? 'updated' : 'created'} successfully.`,
            );
            setEditor(null);
            setRevision((v) => v + 1);
          }}
        />
      )}
      {deleting && (
        <ConfirmationDialog
          title="Delete category?"
          description={
            <>“{deleting.title}” will be removed from your category library.</>
          }
          confirmLabel="Delete category"
          pendingLabel="Deleting…"
          pending={pendingDelete}
          error={deleteError}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </section>
  );
}
