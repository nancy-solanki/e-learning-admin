import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
export type Category = {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: { id: string; url: string; name: string } | null;
  created_at: string | null;
  updated_at: string | null;
};
export type CategoryPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
};
const endpoint = ENDPOINTS.CATEGORY.LIST;
const detail = ENDPOINTS.CATEGORY.DETAIL;
export async function listCategories(
  params: { search: string; ordering: string; page: number; page_size: number },
  signal?: AbortSignal,
) {
  return (await api.get<CategoryPage>(endpoint, { params, signal })).data;
}
export async function getCategory(slug: string) {
  return (await api.get<Category>(detail(slug))).data;
}
export async function saveCategory(body: FormData, slug?: string) {
  return (
    await api.request<Category>({
      url: slug ? detail(slug) : endpoint,
      method: slug ? 'PATCH' : 'POST',
      data: body,
      headers: { 'Content-Type': undefined },
    })
  ).data;
}
export async function deleteCategory(slug: string) {
  await api.delete(detail(slug));
}
