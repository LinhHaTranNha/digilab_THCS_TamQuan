import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { askAiAdvisor, getApiErrorMessage, getSectionLabel } from '../../services/apiService';
import { useAuth } from '../../store/AuthContext';

const initialFilters = {
  grade: 'Tất cả',
  subject: 'Tất cả',
  section: 'Tất cả',
  resourceType: 'Tất cả',
};

const advisorPresets = [
  {
    key: 'entrance-exam',
    label: 'Ôn thi vào 10',
    filters: { grade: 'Khối 9', section: 'exams', resourceType: 'Đề thi' },
  },
  {
    key: 'quick-practice',
    label: 'Luyện đề nhanh',
    filters: { section: 'exams', resourceType: 'Đề cương' },
  },
  {
    key: 'foundation-review',
    label: 'Học lại nền tảng',
    filters: { section: 'library', resourceType: 'Tài liệu' },
  },
];

const hasActiveFilters = (filters) => Object.values(filters).some((value) => value !== 'Tất cả');

const getActivePresetKey = (filters) => {
  const entries = {
    'entrance-exam': { grade: 'Khối 9', section: 'exams', resourceType: 'Đề thi' },
    'quick-practice': { section: 'exams', resourceType: 'Đề cương' },
    'foundation-review': { section: 'library', resourceType: 'Tài liệu' },
  };

  return Object.entries(entries).find(([, preset]) => {
    return Object.entries(preset).every(([key, value]) => filters[key] === value);
  })?.[0];
};

const ADVISOR_CHAT_STORAGE_KEY = 'digilib-advisor-chat';
const ADVISOR_FILTER_STORAGE_KEY = 'digilib-advisor-filters';
const ADVISOR_RECENT_QUESTIONS_KEY = 'digilib-advisor-recent-questions';
const ADVISOR_PINNED_PROMPTS_KEY = 'digilib-advisor-pinned-prompts';
const ADVISOR_KEEP_QUESTION_PREF_KEY = 'digilib-advisor-keep-question';
const ADVISOR_KEEP_FILTERS_PREF_KEY = 'digilib-advisor-keep-filters';
const ADVISOR_CUSTOM_PRESETS_KEY = 'digilib-advisor-custom-presets';
const ADVISOR_IMPORT_HISTORY_KEY = 'digilib-advisor-import-history';

// Advisor UI rule: keep this page minimal and stable.
// Primary flow only: choose filters -> ask -> get answer.
// Avoid adding secondary controls unless they clearly improve the main task.
const normalizeAdvisorAnswer = (text = '') => {
  if (!text) return '';

  return text
    .replace(/```(?:json|markdown|md)?/gi, '')
    .replace(/```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const AdvisorPage = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [question, setQuestion] = useState('');
  const [filters, setFilters] = useState(() => {
    try {
      // Priority 1: URL params
      const gradeParam = searchParams.get('grade');
      const subjectParam = searchParams.get('subject');
      const sectionParam = searchParams.get('section');
      const typeParam = searchParams.get('resourceType');

      if (gradeParam || subjectParam || sectionParam || typeParam) {
        return {
          grade: gradeParam || 'Tất cả',
          subject: subjectParam || 'Tất cả',
          section: sectionParam || 'Tất cả',
          resourceType: typeParam || 'Tất cả',
        };
      }

      // Priority 2: Local storage
      const raw = window.localStorage.getItem(ADVISOR_FILTER_STORAGE_KEY);
      if (!raw) return initialFilters;
      return {
        ...initialFilters,
        ...JSON.parse(raw),
      };
    } catch {
      return initialFilters;
    }
  });

  const [messages, setMessages] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADVISOR_CHAT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(-12) : [];
    } catch {
      return [];
    }
  });
  const [recentQuestions, setRecentQuestions] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADVISOR_RECENT_QUESTIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  });
  const [pinnedPrompts, setPinnedPrompts] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADVISOR_PINNED_PROMPTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch {
      return [];
    }
  });
  const [keepQuestionAfterSend, setKeepQuestionAfterSend] = useState(() => window.localStorage.getItem(ADVISOR_KEEP_QUESTION_PREF_KEY) === '1');
  const [keepFiltersAfterSend, setKeepFiltersAfterSend] = useState(() => window.localStorage.getItem(ADVISOR_KEEP_FILTERS_PREF_KEY) === '1');
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADVISOR_CUSTOM_PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [filterNotice, setFilterNotice] = useState('');
  const [lastResetFilters, setLastResetFilters] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);
  const [importWarningStats, setImportWarningStats] = useState({ skipped: 0, normalized: 0, duplicate: 0 });
  const [lastImportAt, setLastImportAt] = useState('');
  const [importHistory, setImportHistory] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ADVISOR_IMPORT_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed
            .slice(0, 3)
            .map((entry) => ({
              ...entry,
              presetsSnapshot: Array.isArray(entry?.presetsSnapshot) ? entry.presetsSnapshot.slice(0, 6) : [],
            }))
        : [];
    } catch {
      return [];
    }
  });
  const [expandedHistoryIndex, setExpandedHistoryIndex] = useState(-1);
  const [showImportWarnings, setShowImportWarnings] = useState(true);
  const [warningFilter, setWarningFilter] = useState('all');
  const [expandedWarnings, setExpandedWarnings] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');

  const helperText = useMemo(() => {
    if (!currentUser) {
      return 'Bạn cần đăng nhập để sử dụng trợ lý AI.';
    }

    if (currentUser.role === 'student') {
      return `Bạn đang đăng nhập với ${currentUser.grade}. Nếu muốn hỏi tài liệu cho khối khác, cứ nêu rõ trong câu hỏi hoặc chọn bộ lọc tương ứng.`;
    }

    return 'Bạn có thể đặt câu hỏi như học sinh để thử tư vấn tài liệu từ metadata hiện có.';
  }, [currentUser]);

  const activePresetKey = useMemo(() => getActivePresetKey(filters), [filters]);

  const activePresetLabel = useMemo(() => {
    if (activePresetKey) {
      return advisorPresets.find((preset) => preset.key === activePresetKey)?.label || 'Preset hệ thống';
    }

    if (hasActiveFilters(filters)) {
      return 'Tùy chỉnh';
    }

    return 'Mặc định';
  }, [activePresetKey, filters]);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_FILTER_STORAGE_KEY, JSON.stringify(filters));

    // Sync to URL
    const nextParams = new URLSearchParams();
    if (filters.grade !== 'Tất cả') nextParams.set('grade', filters.grade);
    if (filters.subject !== 'Tất cả') nextParams.set('subject', filters.subject);
    if (filters.section !== 'Tất cả') nextParams.set('section', filters.section);
    if (filters.resourceType !== 'Tất cả') nextParams.set('resourceType', filters.resourceType);

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-12)));
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_KEEP_QUESTION_PREF_KEY, keepQuestionAfterSend ? '1' : '0');
  }, [keepQuestionAfterSend]);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_KEEP_FILTERS_PREF_KEY, keepFiltersAfterSend ? '1' : '0');
  }, [keepFiltersAfterSend]);

  useEffect(() => {
    window.localStorage.setItem(ADVISOR_IMPORT_HISTORY_KEY, JSON.stringify(importHistory.slice(0, 3)));
  }, [importHistory]);

  const restoreImportHistoryEntry = (index) => {
    const entry = importHistory[index];
    if (!entry || !Array.isArray(entry.presetsSnapshot) || !entry.presetsSnapshot.length) {
      setFilterNotice('Không tìm thấy preset snapshot để khôi phục.');
      window.setTimeout(() => setFilterNotice(''), 2200);
      return;
    }

    const restoredPresets = entry.presetsSnapshot.slice(0, 6);
    setCustomPresets(restoredPresets);
    window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(restoredPresets));

    setFilterNotice(
      `Đã khôi phục presets từ ${entry.time} (${entry.mode === 'replace' ? 'thay thế' : 'nối thêm'}).`
    );
    window.setTimeout(() => setFilterNotice(''), 2200);
    setShowImportWarnings(true);
    setWarningFilter('all');
    setExpandedWarnings(false);
  };

  useEffect(() => {
    if (!importWarnings.length) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setImportWarnings([]);
      setLastImportAt('');
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [importWarnings]);

  const submitQuestion = async (customQuestion) => {
    const nextQuestion = (customQuestion ?? question).trim();

    if (!nextQuestion || loading) {
      return;
    }

    setError('');
    setLoading(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: nextQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);

    const nextRecentQuestions = [
      nextQuestion,
      ...recentQuestions.filter((item) => item.toLowerCase() !== nextQuestion.toLowerCase()),
    ].slice(0, 6);
    setRecentQuestions(nextRecentQuestions);
    window.localStorage.setItem(ADVISOR_RECENT_QUESTIONS_KEY, JSON.stringify(nextRecentQuestions));

    try {
      const response = await askAiAdvisor({
        question: nextQuestion,
        grade: filters.grade === 'Tất cả' ? undefined : filters.grade,
        subject: filters.subject === 'Tất cả' ? undefined : filters.subject,
        section: filters.section === 'Tất cả' ? undefined : filters.section,
        resourceType: filters.resourceType === 'Tất cả' ? undefined : filters.resourceType,
      });

      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: normalizeAdvisorAnswer(response.answer),
          recommendedDocuments: response.recommendedDocuments || [],
          planBySubject: response.planBySubject || [],
          appliedFilters: {
            grade: response.appliedGrade,
            subject: response.appliedSubject,
            subjects: response.appliedSubjects || [],
            section: response.appliedSection,
            resourceType: response.appliedResourceType,
          },
        },
      ]);
      if (!keepQuestionAfterSend) {
        setQuestion('');
      }
      if (!keepFiltersAfterSend) {
        setFilters(initialFilters);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể kết nối trợ lý AI lúc này.'));
      setMessages((previous) => previous.filter((message) => message.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitQuestion();
  };

  const handleQuestionKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await submitQuestion();
    }
  };

  const applyFiltersFromMessage = (appliedFilters) => {
    if (!appliedFilters) {
      return;
    }

    setFilters({
      grade: appliedFilters.grade || 'Tất cả',
      subject: appliedFilters.subject || 'Tất cả',
      section: appliedFilters.section || 'Tất cả',
      resourceType: appliedFilters.resourceType || 'Tất cả',
    });
    setFilterNotice('Đã áp dụng bộ lọc từ câu trả lời trước.');
    window.setTimeout(() => setFilterNotice(''), 2200);
  };

  const updateFilter = (field, value) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const formatFilters = (appliedFilters = {}) => {
    const parts = [
      appliedFilters.grade,
      ...(appliedFilters.subjects?.length ? appliedFilters.subjects : [appliedFilters.subject]),
      appliedFilters.section ? getSectionLabel(appliedFilters.section) : null,
      appliedFilters.resourceType,
    ].filter(Boolean);

    if (!parts.length) return '';

    return `\n\nBộ lọc áp dụng: ${parts.join(' · ')}`;
  };

  const handleCopyAnswer = async (text, messageId, appliedFilters) => {
    const payload = `${text}${formatFilters(appliedFilters)}`;

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedMessageId(messageId || '');
      setCopyNotice('Đã sao chép câu trả lời.');
      window.setTimeout(() => {
        setCopyNotice('');
        setCopiedMessageId('');
      }, 2200);
    } catch {
      setCopyNotice('Không thể sao chép câu trả lời.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const handleCopyAnswerWithDocuments = async (text, documents = [], messageId, appliedFilters) => {
    const documentLines = documents.map((document, index) => `${index + 1}. ${document.title} — ${document.subject} · ${document.grade}${document.pdfUrl ? `\n   ${document.pdfUrl}` : ''}`);

    const payload = [
      `${text}${formatFilters(appliedFilters)}`,
      documentLines.length ? '\nTài liệu gợi ý:' : null,
      documentLines.length ? documentLines.join('\n') : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedMessageId(messageId || '');
      setCopyNotice('Đã sao chép câu trả lời kèm tài liệu gợi ý.');
      window.setTimeout(() => {
        setCopyNotice('');
        setCopiedMessageId('');
      }, 2200);
    } catch {
      setCopyNotice('Không thể sao chép nội dung chia sẻ.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const handleCopyFullExchange = async (userText, assistantText, documents = [], appliedFilters, messageId) => {
    const documentLines = documents.map((document, index) => `${index + 1}. ${document.title} — ${document.subject} · ${document.grade}${document.pdfUrl ? `\n   ${document.pdfUrl}` : ''}`);

    const payload = [
      'Hỏi:',
      userText,
      '\nTrả lời:',
      `${assistantText}${formatFilters(appliedFilters)}`,
      documentLines.length ? '\nTài liệu gợi ý:' : null,
      documentLines.length ? documentLines.join('\n') : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedMessageId(messageId || '');
      setCopyNotice('Đã sao chép cả câu hỏi và câu trả lời.');
      window.setTimeout(() => {
        setCopyNotice('');
        setCopiedMessageId('');
      }, 2200);
    } catch {
      setCopyNotice('Không thể sao chép nội dung trao đổi.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const togglePinnedPrompt = (prompt) => {
    const exists = pinnedPrompts.some((item) => item.toLowerCase() === prompt.toLowerCase());

    const nextPinnedPrompts = exists
      ? pinnedPrompts.filter((item) => item.toLowerCase() !== prompt.toLowerCase())
      : [prompt, ...pinnedPrompts].slice(0, 8);

    setPinnedPrompts(nextPinnedPrompts);
    window.localStorage.setItem(ADVISOR_PINNED_PROMPTS_KEY, JSON.stringify(nextPinnedPrompts));
  };

  const pinCurrentQuestion = () => {
    const nextQuestion = question.trim();
    if (!nextQuestion) {
      return;
    }

    const exists = pinnedPrompts.some((item) => item.toLowerCase() === nextQuestion.toLowerCase());
    if (exists) {
      setCopyNotice('Câu hỏi này đã được ghim trước đó.');
      window.setTimeout(() => setCopyNotice(''), 2000);
      return;
    }

    const nextPinnedPrompts = [nextQuestion, ...pinnedPrompts].slice(0, 8);
    setPinnedPrompts(nextPinnedPrompts);
    window.localStorage.setItem(ADVISOR_PINNED_PROMPTS_KEY, JSON.stringify(nextPinnedPrompts));
    setCopyNotice('Đã ghim câu hỏi hiện tại.');
    window.setTimeout(() => setCopyNotice(''), 2000);
  };

  const saveCurrentAsPreset = () => {
    setImportWarnings([]);
    setLastImportAt('');
    const presetName = window.prompt('Tên preset (ví dụ: Ôn Văn cuối tuần):');
    const nextName = presetName?.trim();

    if (!nextName) {
      return;
    }

    const exists = customPresets.some((item) => item.name.toLowerCase() === nextName.toLowerCase());
    const nextPreset = { name: nextName, filters };

    const nextCustomPresets = exists
      ? customPresets.map((item) => (item.name.toLowerCase() === nextName.toLowerCase() ? nextPreset : item))
      : [nextPreset, ...customPresets].slice(0, 6);

    setCustomPresets(nextCustomPresets);
    window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(nextCustomPresets));
    setFilterNotice(`Đã lưu preset: ${nextName}`);
    window.setTimeout(() => setFilterNotice(''), 2200);
  };

  const duplicateCustomPreset = (name) => {
    setImportWarnings([]);
    setLastImportAt('');
    const existingPreset = customPresets.find((item) => item.name === name);
    if (!existingPreset) {
      return;
    }

    const nextName = window.prompt('Lưu thành preset mới:', `${name} bản sao`)?.trim();
    if (!nextName) {
      return;
    }

    const exists = customPresets.some((item) => item.name.toLowerCase() === nextName.toLowerCase());
    if (exists) {
      setFilterNotice(`Preset ${nextName} đã tồn tại.`);
      window.setTimeout(() => setFilterNotice(''), 2200);
      return;
    }

    const nextCustomPresets = [{ ...existingPreset, name: nextName }, ...customPresets].slice(0, 6);
    setCustomPresets(nextCustomPresets);
    window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(nextCustomPresets));
    setFilterNotice(`Đã tạo preset mới: ${nextName}`);
    window.setTimeout(() => setFilterNotice(''), 2200);
  };

  const exportCustomPresets = () => {
    if (!customPresets.length) {
      setFilterNotice('Không có preset tùy chỉnh để xuất.');
      window.setTimeout(() => setFilterNotice(''), 1800);
      return;
    }

    const payload = JSON.stringify(customPresets, null, 2);
    window.prompt('Sao chép JSON presets:', payload);
  };

  const importCustomPresets = () => {
    setImportWarnings([]);
    setImportWarningStats({ skipped: 0, normalized: 0, duplicate: 0 });
    setLastImportAt('');
    setShowImportWarnings(true);
    const input = window.prompt('Dán JSON presets (định dạng: [{ name, filters }]):');
    if (!input) {
      return;
    }

    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        throw new Error('Preset JSON phải là mảng');
      }

      const warnings = [];
      const stats = { skipped: 0, normalized: 0, duplicate: 0 };
      const normalized = parsed
        .slice(0, 6)
        .map((item, index) => {
          const nextName = typeof item.name === 'string' ? item.name.trim() : '';
          if (!nextName) {
            warnings.push(`Mục ${index + 1}: thiếu tên preset, đã bỏ qua.`);
            stats.skipped += 1;
            return null;
          }

          const hasValidFilters = typeof item.filters === 'object' && item.filters;
          if (!hasValidFilters) {
            warnings.push(`Mục ${index + 1} (${nextName}): thiếu filters, dùng mặc định.`);
            stats.normalized += 1;
          }

          return {
            name: nextName,
            filters: {
              ...initialFilters,
              ...(hasValidFilters ? item.filters : {}),
            },
          };
        })
        .filter(Boolean);

      if (!normalized.length) {
        throw new Error('Không có preset hợp lệ để nhập.');
      }

      const mode = window.prompt('Nhập "replace" để thay thế, hoặc bất kỳ để nối thêm (tối đa 6).', 'append')?.toLowerCase();
      const merged = mode === 'replace'
        ? normalized
        : [...normalized, ...customPresets]
            .reduce((acc, item) => {
              if (!acc.find((x) => x.name.toLowerCase() === item.name.toLowerCase())) {
                acc.push(item);
              } else {
                warnings.push(`Preset trùng tên bị bỏ qua: ${item.name}`);
                stats.duplicate += 1;
              }
              return acc;
            }, [])
            .slice(0, 6);

      const importedCount = normalized.length;
      const finalCount = merged.length;
      const duplicateCount = Math.max(0, stats.duplicate);
      const importedAt = new Date().toLocaleString('vi-VN');

      setCustomPresets(merged);
      setImportWarnings(warnings.slice(0, 6));
      setImportWarningStats({ ...stats, skipped: stats.skipped, normalized: stats.normalized, duplicate: duplicateCount });
      setLastImportAt(importedAt);
      setImportHistory((previous) => [
        {
          time: importedAt,
          mode: mode === 'replace' ? 'replace' : 'append',
          imported: importedCount,
          duplicates: duplicateCount,
          total: finalCount,
          warnings: warnings.slice(0, 6),
          presetsSnapshot: merged,
        },
        ...previous,
      ].slice(0, 3));
      setShowImportWarnings(true);
      setWarningFilter('all');
      setExpandedWarnings(false);
      window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(merged));
      setFilterNotice(
        mode === 'replace'
          ? `Đã thay thế presets (nhập: ${importedCount}, giữ: ${finalCount}).`
          : `Đã nối thêm presets (nhập: ${importedCount}, trùng: ${duplicateCount}, tổng: ${finalCount}).`
      );
      window.setTimeout(() => setFilterNotice(''), 2200);
    } catch (e) {
      setImportWarnings([]);
      setImportWarningStats({ skipped: 0, normalized: 0, duplicate: 0 });
      setLastImportAt('');
      setFilterNotice('Không thể nhập preset. Kiểm tra JSON.');
      window.setTimeout(() => setFilterNotice(''), 2200);
    }
  };

  const renameCustomPreset = (name) => {
    const existingPreset = customPresets.find((item) => item.name === name);
    if (!existingPreset) {
      return;
    }

    const nextName = window.prompt('Đổi tên preset:', name)?.trim();
    if (!nextName || nextName === name) {
      return;
    }

    const hasDuplicateName = customPresets.some(
      (item) => item.name.toLowerCase() === nextName.toLowerCase() && item.name !== name,
    );

    if (hasDuplicateName) {
      setFilterNotice(`Preset ${nextName} đã tồn tại.`);
      window.setTimeout(() => setFilterNotice(''), 2200);
      return;
    }

    const nextCustomPresets = customPresets.map((item) =>
      item.name === name ? { ...item, name: nextName } : item
    );

    setCustomPresets(nextCustomPresets);
    window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(nextCustomPresets));
    setFilterNotice(`Đã đổi tên preset thành: ${nextName}`);
    window.setTimeout(() => setFilterNotice(''), 2200);
  };

  const moveCustomPreset = (name, direction) => {
    const index = customPresets.findIndex((item) => item.name === name);
    if (index < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customPresets.length) {
      return;
    }

    const nextCustomPresets = [...customPresets];
    const [moved] = nextCustomPresets.splice(index, 1);
    nextCustomPresets.splice(targetIndex, 0, moved);

    setCustomPresets(nextCustomPresets);
    window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(nextCustomPresets));
  };

  const removeCustomPreset = (name) => {
    const nextCustomPresets = customPresets.filter((item) => item.name !== name);
    setCustomPresets(nextCustomPresets);
    window.localStorage.setItem(ADVISOR_CUSTOM_PRESETS_KEY, JSON.stringify(nextCustomPresets));
  };

  const copyImportWarnings = async () => {
    if (!importWarnings.length) {
      return;
    }

    const payload = [
      'Cảnh báo nhập preset:',
      ...importWarnings.map((item, index) => `${index + 1}. ${item}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopyNotice('Đã sao chép cảnh báo nhập preset.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    } catch {
      setCopyNotice('Không thể sao chép cảnh báo.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const copyCustomPresetsJson = async () => {
    if (!customPresets.length) {
      setCopyNotice('Không có preset để sao chép.');
      window.setTimeout(() => setCopyNotice(''), 2000);
      return;
    }

    const payload = JSON.stringify(customPresets, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopyNotice('Đã sao chép JSON presets.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    } catch {
      setCopyNotice('Không thể sao chép JSON presets.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const copyImportHistoryEntry = async (entry) => {
    if (!entry) {
      return;
    }

    const payload = [
      `Thời gian: ${entry.time}`,
      `Chế độ: ${entry.mode === 'replace' ? 'thay thế' : 'nối thêm'}`,
      `Nhập: ${entry.imported}`,
      `Trùng: ${entry.duplicates}`,
      `Tổng: ${entry.total}`,
      entry.warnings?.length ? '\nCảnh báo:' : null,
      entry.warnings?.length ? entry.warnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n') : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(payload);
      setCopyNotice('Đã sao chép lịch sử nhập này.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    } catch {
      setCopyNotice('Không thể sao chép lịch sử nhập.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  const copyImportHistorySnapshot = async (entry) => {
    if (!entry?.presetsSnapshot?.length) {
      setCopyNotice('Không có snapshot để sao chép.');
      window.setTimeout(() => setCopyNotice(''), 2000);
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(entry.presetsSnapshot, null, 2));
      setCopyNotice('Đã sao chép snapshot JSON của lần nhập này.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    } catch {
      setCopyNotice('Không thể sao chép snapshot JSON.');
      window.setTimeout(() => setCopyNotice(''), 2200);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#eff6ff_28%,_#f8fafc_62%)] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8 grid lg:grid-cols-[0.84fr,1.16fr] gap-5 items-stretch min-h-screen">
          <div className="overflow-y-auto pr-1 space-y-4">
            <div className="card-surface overflow-hidden">
              <div className="px-5 py-5 sm:px-6 sm:py-6 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
                <p className="text-[11px] uppercase tracking-[0.34em] text-blue-200/90 mb-3">Trợ lý AI</p>
                <h1 className="text-3xl sm:text-[2rem] font-black leading-tight">Tư vấn tài liệu học tập theo nhu cầu</h1>
                <p className="mt-3 text-sm sm:text-[15px] leading-7 text-slate-200/90 max-w-2xl">
                  Khung chat này chỉ gọi tới backend của DigiLib. Backend sẽ chọn shortlist tài liệu từ cơ sở dữ liệu rồi mới gửi metadata đó sang mô hình AI.
                </p>
                <div className="mt-4 inline-flex max-w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-blue-50 shadow-inner backdrop-blur-sm">
                  {helperText}
                </div>
              </div>
            </div>

            <div className="card-surface p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-heading">Bộ lọc tìm tài liệu</p>
                  <p className="mt-2 text-sm text-slate-500">Giữ nguyên cấu trúc lọc, chỉ tối ưu độ rõ ràng và khoảng thở khi thao tác.</p>
                </div>
                <span className="badge-soft">{activePresetLabel}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-slate-700">
                  Khối lớp
                  <select
                    value={filters.grade}
                    onChange={(event) => updateFilter('grade', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none transition focus:ring-2 focus:ring-blue-500"
                  >
                    {['Tất cả', 'Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'].map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Môn học
                  <select
                    value={filters.subject}
                    onChange={(event) => updateFilter('subject', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none transition focus:ring-2 focus:ring-blue-500"
                  >
                    {['Tất cả', 'Toán', 'Văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý'].map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Danh mục
                  <select
                    value={filters.section}
                    onChange={(event) => updateFilter('section', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none transition focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="library">Thư viện</option>
                    <option value="exams">Đề thi & Đề cương</option>
                    <option value="slides">Slides</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Loại tài liệu
                  <select
                    value={filters.resourceType}
                    onChange={(event) => updateFilter('resourceType', event.target.value)}
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none transition focus:ring-2 focus:ring-blue-500"
                  >
                    {['Tất cả', 'Ebook', 'Tài liệu', 'Đề thi', 'Đề cương', 'Slide'].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3.5">
                {filterNotice && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed font-medium text-emerald-700">
                    {filterNotice}
                  </div>
                )}

                {importWarnings.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-3 shadow-sm">
                    <span>
                      {showImportWarnings ? 'Cảnh báo nhập preset đang hiển thị.' : 'Đã ẩn cảnh báo nhập preset.'}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowImportWarnings((value) => !value)}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition"
                      >
                        {showImportWarnings ? 'Ẩn cảnh báo' : 'Hiện lại'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportWarnings([]);
                          setImportWarningStats({ skipped: 0, normalized: 0, duplicate: 0 });
                          setLastImportAt('');
                          setWarningFilter('all');
                          setExpandedWarnings(false);
                          setShowImportWarnings(true);
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition"
                      >
                        Xóa cảnh báo
                      </button>
                    </div>
                  </div>
                )}

                {showImportWarnings && importWarnings.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold">Lưu ý khi nhập preset:</p>
                        {lastImportAt && (
                          <p className="text-xs text-amber-700 mt-1">Lần nhập gần nhất: {lastImportAt}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={copyImportWarnings}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition"
                        >
                          Sao chép cảnh báo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportWarnings(false);
                            setWarningFilter('all');
                          }}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {importWarningStats.skipped > 0 && (
                        <span className="px-2 py-1 rounded-full bg-white border border-amber-200 text-xs font-semibold">
                          Bỏ qua: {importWarningStats.skipped}
                        </span>
                      )}
                      {importWarningStats.normalized > 0 && (
                        <span className="px-2 py-1 rounded-full bg-white border border-amber-200 text-xs font-semibold">
                          Chuẩn hóa: {importWarningStats.normalized}
                        </span>
                      )}
                      {importWarningStats.duplicate > 0 && (
                        <span className="px-2 py-1 rounded-full bg-white border border-amber-200 text-xs font-semibold">
                          Trùng: {importWarningStats.duplicate}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'skipped', label: 'Bỏ qua' },
                        { key: 'normalized', label: 'Chuẩn hóa' },
                        { key: 'duplicate', label: 'Trùng' },
                      ].map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setWarningFilter(option.key)}
                          className={`px-2 py-1 rounded-full text-xs font-semibold border transition ${
                            warningFilter === option.key
                              ? 'bg-amber-700 text-white border-amber-700'
                              : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <ul className="list-disc ml-5 space-y-1">
                      {importWarnings
                        .filter((warning) => {
                          if (warningFilter === 'all') return true;
                          if (warningFilter === 'skipped') return warning.includes('bỏ qua');
                          if (warningFilter === 'normalized') return warning.includes('dùng mặc định');
                          if (warningFilter === 'duplicate') return warning.includes('trùng tên');
                          return true;
                        })
                        .slice(0, expandedWarnings ? 99 : 3)
                        .map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                    {importWarnings.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setExpandedWarnings((value) => !value)}
                        className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 transition"
                      >
                        {expandedWarnings ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    )}
                  </div>
                )}

                {importHistory.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">Lịch sử nhập gần đây</p>
                        <p className="text-xs text-slate-500 mt-1">Giữ nguyên dữ liệu hiện có, chỉ làm rõ hierarchy và nhóm thao tác.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImportHistory([]);
                          setExpandedHistoryIndex(-1);
                          setImportWarnings([]);
                          setLastImportAt('');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                      >
                        Xóa lịch sử
                      </button>
                    </div>
                    <ul className="space-y-2 text-xs">
                      {importHistory.map((item, index) => (
                        <li key={`${item.time}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 flex flex-col gap-2 shadow-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="badge-soft normal-case tracking-normal text-[11px]">
                              {item.time}
                            </span>
                            <span className="text-slate-600 font-medium">
                              {item.mode === 'replace' ? 'thay thế' : 'nối thêm'} · nhập {item.imported} · trùng {item.duplicates} · tổng {item.total}
                            </span>
                            {item.warnings?.length ? (
                              <button
                                type="button"
                                onClick={() => setExpandedHistoryIndex((prev) => (prev === index ? -1 : index))}
                                className="btn-ghost text-[11px] px-3 py-1.5"
                              >
                                {expandedHistoryIndex === index ? 'Thu gọn' : 'Xem cảnh báo'}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => copyImportHistoryEntry(item)}
                              className="btn-ghost text-[11px] px-3 py-1.5"
                            >
                              Sao chép mục này
                            </button>
                            {item.presetsSnapshot?.length ? (
                              <button
                                type="button"
                                onClick={() => copyImportHistorySnapshot(item)}
                                className="btn-ghost text-[11px] px-3 py-1.5"
                              >
                                Sao chép JSON
                              </button>
                            ) : null}
                            {item.presetsSnapshot?.length ? (
                              <button
                                type="button"
                                onClick={() => restoreImportHistoryEntry(index)}
                                className="btn-ghost text-[11px] px-3 py-1.5 text-emerald-700 border-emerald-200"
                              >
                                Khôi phục
                              </button>
                            ) : null}
                          </div>
                          {expandedHistoryIndex === index && item.warnings?.length ? (
                            <ul className="list-disc ml-5 space-y-1 text-[11px] text-amber-800">
                              {item.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {copyNotice && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    {copyNotice}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-surface p-4 sm:p-5 flex flex-col min-h-[600px] lg:min-h-0 lg:max-h-[calc(100vh-4rem)] gap-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="section-heading">Khung trao đổi</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">Trò chuyện với trợ lý</h2>
                <p className="mt-1 text-sm text-slate-500">Giữ nguyên flow hiện tại, chỉ làm sạch thị giác để đọc và thao tác dễ hơn.</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-2 text-right">
                <span className="badge">{messages.length} tin nhắn</span>
                <span className="text-xs text-slate-400">Bộ lọc hiện tại: {activePresetLabel}</span>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div
                ref={messagesContainerRef}
                className="space-y-4 flex-1 min-h-[220px] overflow-y-auto rounded-[28px] border border-slate-200 bg-white/70 p-3 sm:p-4 pr-2 custom-scrollbar shadow-inner"
              >
                {messages.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 px-6 py-10 text-center text-slate-500 text-sm">
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-xl">💬</div>
                    Chưa có hội thoại nào. Hãy bắt đầu bằng một câu hỏi về nhu cầu học tập của học sinh.
                  </div>
                ) : null}

                {messages.map((message, index) => (
                  <div key={message.id} className={`bubble ${message.role === 'user' ? 'bubble-user ml-auto max-w-[85%]' : 'bubble-assistant mr-auto max-w-[95%]'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${message.role === 'user' ? 'text-slate-300' : 'text-blue-700'}`}>
                        {message.role === 'user' ? 'Bạn' : 'Trợ lý AI'}
                      </p>
                      {message.appliedFilters ? (
                        <p className="text-[10px] text-slate-400 font-medium">
                          {[
                            message.appliedFilters.grade,
                            ...(message.appliedFilters.subjects?.length ? message.appliedFilters.subjects : [message.appliedFilters.subject]),
                            message.appliedFilters.section ? getSectionLabel(message.appliedFilters.section) : null,
                            message.appliedFilters.resourceType,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                    </div>

                    <p className={`text-sm whitespace-pre-line leading-relaxed ${message.role === 'user' ? 'text-slate-100' : 'text-slate-700'}`}>{message.text}</p>

                    {message.role === 'assistant' ? (
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {message.appliedFilters ? (
                          <button
                            type="button"
                            onClick={() => applyFiltersFromMessage(message.appliedFilters)}
                            className="btn-ghost text-[11px] px-3 py-1.5"
                          >
                            Dùng lại bộ lọc
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleCopyAnswer(message.text, `${message.id}-text`, message.appliedFilters)}
                          className="btn-ghost text-[11px] px-3 py-1.5"
                        >
                          {copiedMessageId === `${message.id}-text` ? 'Đã chép' : 'Chép câu trả lời'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyAnswerWithDocuments(message.text, message.recommendedDocuments || [], `${message.id}-bundle`, message.appliedFilters)}
                          className="btn-ghost text-[11px] px-3 py-1.5"
                        >
                          {copiedMessageId === `${message.id}-bundle` ? 'Đã chép' : 'Chép kèm tài liệu'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const prevUser = messages.slice(0, index).reverse().find((item) => item.role === 'user');
                            handleCopyFullExchange(
                              prevUser?.text || 'Không tìm thấy câu hỏi trước đó.',
                              message.text,
                              message.recommendedDocuments || [],
                              message.appliedFilters,
                              `${message.id}-exchange`
                            );
                          }}
                          className="btn-ghost text-[11px] px-3 py-1.5"
                        >
                          {copiedMessageId === `${message.id}-exchange` ? 'Đã chép' : 'Chép cả trao đổi'}
                        </button>
                      </div>
                    ) : null}

                    {message.recommendedDocuments?.length ? (
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {message.recommendedDocuments.map((document) => (
                          <div key={document.id} className="doc-card">
                            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400 mb-1">{getSectionLabel(document.section)}</p>
                            <h3 className="text-xs font-bold text-slate-900 mb-1 line-clamp-1">{document.title}</h3>
                            <p className="text-[10px] text-slate-500 mb-2">{document.subject} · {document.grade}</p>
                            <div className="flex gap-2">
                              <Link
                                to={`/documents/${document.id}`}
                                className="btn-primary text-[10px] px-2.5 py-1.5 rounded-lg"
                              >
                                Xem
                              </Link>
                              <a
                                href={document.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-soft text-[10px] px-2.5 py-1.5 rounded-lg"
                              >
                                PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {message.planBySubject?.length ? (
                      <div className="mt-4 space-y-2.5">
                        <p className="section-heading">Kế hoạch học tập</p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {message.planBySubject.map((plan) => (
                            <div key={`${message.id}-${plan.subject}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <p className="text-[11px] font-bold text-slate-900 mb-1">{plan.subject}</p>
                              <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">{plan.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

                {loading && (
                  <div className="rounded-2xl p-4 shadow-sm border bg-slate-50 border-slate-200 mr-auto max-w-[95%] animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1">Trợ lý đang suy nghĩ...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span>Nhập câu hỏi</span>
                    <span className="text-xs text-slate-400">Shift+Enter xuống dòng · Enter gửi</span>
                  </div>
                  <div className="mt-2 flex items-end gap-3">
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={handleQuestionKeyDown}
                      rows="4"
                      maxLength={500}
                      placeholder="Gõ câu hỏi cho trợ lý..."
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={loading || question.trim().length < 3}
                      className="h-[46px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {loading ? '...' : 'Gửi'}
                    </button>
                  </div>
                </label>

                {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-700">{error}</div> : null}

              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdvisorPage;