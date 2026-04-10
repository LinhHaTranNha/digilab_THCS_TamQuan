import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ACCESS_TOKEN_KEY = 'digital-library-access-token';

export const ROLE_LABELS = {
  school: 'Nhà trường',
  teacher: 'Giáo viên',
  student: 'Học sinh',
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function loginUser(identifier, password) {
  const { data } = await apiClient.post('/auth/login', { identifier, password });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function registerUser(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function getCurrentUser() {
  if (!getAccessToken()) {
    return null;
  }

  try {
    const { data } = await apiClient.get('/auth/me');
    return data;
  } catch {
    clearAccessToken();
    return null;
  }
}

export function logoutUser() {
  clearAccessToken();
}

export async function getDocuments(params = {}) {
  const { data } = await apiClient.get('/documents', { params });

  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      pageSize: data.length,
      total: data.length,
      totalPages: 1,
    };
  }

  return data;
}

export async function getDocumentsBySection(section, params = {}) {
  return getDocuments({ ...params, section });
}

export async function getDocumentById(documentId) {
  const { data } = await apiClient.get(`/documents/${documentId}`);
  return data;
}

export async function getUniqueSubjects(section) {
  const { data } = await apiClient.get('/documents/subjects', { params: { section } });

  if (!Array.isArray(data)) {
    return [];
  }

  return [...new Set(data.map((item) => (item || '').trim()).filter(Boolean))];
}

export async function saveDocument(payload) {
  const requestData = {
    title: payload.title,
    description: payload.description,
    author: payload.author,
    subject: payload.subject,
    grade: payload.grade,
    section: payload.section,
    resourceType: payload.resourceType,
    image: payload.image,
    pdfUrl: payload.pdfUrl,
  };

  if (payload.id) {
    const { data } = await apiClient.put(`/documents/${payload.id}`, requestData);
    return data;
  }

  const { data } = await apiClient.post('/documents', requestData);
  return data;
}

export async function deleteDocument(documentId) {
  await apiClient.delete(`/documents/${documentId}`);
}

export async function getDonations() {
  const { data } = await apiClient.get('/donations');
  return data;
}

export async function getSubjectStats(params = {}) {
  const { data } = await apiClient.get('/stats/subjects', { params });
  return data?.items || [];
}

export async function getAuthorStats(params = {}) {
  const { data } = await apiClient.get('/stats/authors', { params });
  return data?.items || [];
}

export async function getOverviewStats(params = {}) {
  const { data } = await apiClient.get('/stats/overview', { params });
  return data || { totals: {}, byGrade: [] };
}

export async function saveDonation(payload) {
  const { data } = await apiClient.post('/donations', {
    fullName: payload.fullName,
    bookName: payload.bookName,
    grade: payload.grade,
    condition: payload.condition,
    message: payload.message,
  });
  return data;
}

export async function askAiAdvisor(payload) {
  const advisorPayload = {
    question: payload.question,
    grade: payload.grade,
    subject: payload.subject,
    section: payload.section,
    resourceType: payload.resourceType,
    examGoal: payload.examGoal,
  };

  try {
    const { data } = await apiClient.post('/ai/advisor', advisorPayload);
    return data;
  } catch (error) {
    // Backward compatibility for deployed backend versions that still expose /chat.
    if (error?.response?.status !== 404) {
      throw error;
    }

    const { data } = await apiClient.post('/chat', {
      message: payload.question,
    });

    return {
      answer: data.reply,
      recommendedDocuments: [],
      planBySubject: [],
      appliedGrade: payload.grade || null,
      appliedSubject: payload.subject || null,
      appliedSubjects: payload.subject ? [payload.subject] : null,
      appliedSection: payload.section || null,
      appliedResourceType: payload.resourceType || null,
      appliedExamGoal: payload.examGoal || null,
    };
  }
}

export function getSectionLabel(section) {
  const labels = {
    library: 'Thư viện',
    exams: 'Đề thi & Đề cương',
    slides: 'Slides bài giảng',
  };

  return labels[section] || section;
}

export function getSectionOptionsForRole(role) {
  if (role === 'school' || role === 'teacher') {
    return ['library', 'exams', 'slides'];
  }

  return [];
}

export function getResourceTypeOptions(section, role) {
  if (section === 'library') {
    return ['Ebook', 'Tài liệu'];
  }

  if (section === 'exams') {
    return ['Đề thi', 'Đề cương'];
  }

  if (section === 'slides') {
    return ['Slide'];
  }

  return ['Tài liệu'];
}

export function canManageDocument(user, document) {
  if (!user) {
    return false;
  }

  if (user.role === 'school') {
    return true;
  }

  return user.role === 'teacher' && document.createdById === user.id;
}

export function getApiErrorMessage(error, fallbackMessage) {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (responseData?.detail) {
    return responseData.detail;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  return fallbackMessage;
}
