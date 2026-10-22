import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { IS_DEMO_MODE } from "../lib/demo-mode";
import { DEMO_PACKAGES, DEMO_QUESTION_BANK } from "../lib/demo-data";
import { saveDemoResult } from "../lib/demo-api";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { DEFAULT_USER } from "../data/userData";
import { practiceXP } from "@latveria/shared";
import { sound } from "../utils/audioFeedback";
import {
  practiceOptionKeys as INDEX_TO_KEY,
  practiceAnswersToPayload,
} from "../lib/practice/practice-answers";

const AppContext = createContext();

// ponytail: map between API slugs and view short codes
const SLUG_TO_SHORT = {
  "penalaran-umum": "PU",
  "pengetahuan-pemahaman-umum": "PPU",
  "pemahaman-bacaan-menulis": "PBM",
  "pengetahuan-kuantitatif": "PK",
  "literasi-bahasa-indonesia": "LBI",
  "literasi-bahasa-inggris": "LBE",
  "penalaran-matematika": "PM",
};
const SHORT_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_SHORT).map(([slug, short]) => [short, slug]),
);

const SECTION_MAP = {
  PU: "Tes Skolastik",
  PPU: "Tes Skolastik",
  PBM: "Tes Skolastik",
  PK: "Tes Skolastik",
  LBI: "Tes Literasi",
  LBE: "Tes Literasi",
  PM: "Tes Literasi",
};

/** Convert API topics to the learner catalog shape. */
function topicToSubject(topic) {
  const short = SLUG_TO_SHORT[topic.slug] || topic.short || topic.slug;
  const category =
    topic.category === "tka"
      ? "Tes Kemampuan Akademik"
      : topic.category === "ujian-mandiri"
        ? "Ujian Mandiri"
        : topic.category === "mata-kuliah"
          ? "Mata Kuliah"
          : SECTION_MAP[short] || (topic.section === "literasi" ? "Tes Literasi" : "Tes Skolastik");
  return {
    id: short,
    slug: topic.slug,
    topicId: topic.id,
    name: topic.name,
    code: short.startsWith("SNBT-") ? short : `LTV-${short.toUpperCase()}`,
    category,
    questionsCount: topic.qu
…[1 chars truncated — re-run with head/grep/tail for full output]…
ackend authenticated user + fetch topics/summary/history
  useEffect(() => {
    loadProfile();
    refreshTopics();

    // Fetch learner summary
    refreshSummary().catch(() => {});

    // Fetch learner history
    api("/learner/history")
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
          // Map history to recentActivities format for dashboard
          const recentActivities = data.slice(0, 6).map((h) => {
            const short = SLUG_TO_SHORT[h.slug] || h.slug;
            return {
              id: h.id,
              code: short,
              subject: h.topic,
              title: `Selesai ${h.total} Soal ${h.topic}`,
              xp: h.earnedXP ?? practiceXP(h.correct),
              time: new Date(h.submittedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : "0%",
            };
          });
          setUser((prev) => ({ ...prev, recentActivities }));
        }
      })
      .catch(() => {});
  }, [loadProfile, refreshTopics, refreshSummary]);

  useEffect(() => {
    // Perbarui streak saat hari WIB berganti dan latihan diselesaikan di tab lain.
    const refresh = () => {
      if (document.visibilityState === "visible") refreshSummary().catch(() => {});
    };
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshSummary]);

  // Synchronize Theme & Body Class
  useEffect(() => {
    localStorage.setItem("latveria_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Show Toast
  const showToast = (title, subtitle = "", type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, subtitle, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Open Lexicon Dictionary Annotation
  const openLexicon = (annotation, questionId) => {
    if (!annotation?.id || !questionId) return;
    sound.playClick();
    setLexiconState({ isOpen: true, wordData: annotation, questionId });
  };

  const closeLexicon = () => {
    setLexiconState({ isOpen: false, wordData: null });
  };

  const fetchSubtestPackages = useCallback(async (slugOrId, signal) => {
    const data = await api(`/learner/topics/${slugOrId}/packages`, { signal });
    if (!Array.isArray(data)) throw new Error("Respons paket tidak valid.");
    return data;
  }, []);

  // Start a Practice Session — fetches real questions from API
  const startPractice = useCallback(
    async (
      subjectId,
      mode = "Practice",
      count = 10,
      difficulty = "Latverian Elite",
      packageId = null,
    ) => {
      if (submitLock.current) return;
      setSubmissionError("");
      sound.playClick();

      const subject = topics.find((s) => s.id === subjectId || s.slug === subjectId) || topics[0];
      if (!subject) {
        showToast("SYSTEM ERROR", "Subtes tidak ditemukan. Muat ulang halaman.", "error");
        return;
      }

      setLoading(true);
      try {
        const slug = subject.slug || SHORT_TO_SLUG[subjectId];
        let data;
        let sessionQuestions;
        if (IS_DEMO_MODE) {
          const demoItems = DEMO_QUESTION_BANK[slug] || [];
          if (!demoItems.length) {
            showToast("PAKET DEMO BELUM TERSEDIA", "Pilih salah satu paket contoh di katalog Drilling.", "error");
            return;
          }
          const demoPackage = DEMO_PACKAGES.find((item) => item.id === packageId);
          data = {
            packageId: packageId ?? null,
            packageName: demoPackage?.name ?? "Latihan cepat · Demo",
            items: demoItems,
          };
          sessionQuestions = demoItems.map((item) => ({
            id: item.id,
            question: item.prompt,
            passage: item.passage ?? null,
            annotations: item.annotations ?? [],
            options: item.options.map((text, index) => ({ key: INDEX_TO_KEY[index], text })),
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
          }));
        } else {
          const url = packageId
            ? `/api/learner/practice/${slug}/${packageId}`
            : `/api/learner/practice/${slug}`;
          const res = await fetch(url);
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          data = await res.json();

          if (!data.items || data.items.length === 0) {
            showToast(
              "TIDAK ADA SOAL",
              `Subtes ${subject.name} belum memiliki soal pada paket ini.`,
              "error",
            );
            return;
          }
          // Normalize API questions to view shape
          sessionQuestions = data.items.map(apiQuestionToView);
        }

        // Slice to requested count if specified and smaller than package
        if (count && sessionQuestions.length > count) {
          // Shuffle then slice
          for (let i = sessionQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sessionQuestions[i], sessionQuestions[j]] = [sessionQuestions[j], sessionQuestions[i]];
          }
          sessionQuestions = sessionQuestions.slice(0, count);
        }

        const session = {
          submissionId: crypto.randomUUID(),
          subjectId: subject.id,
          subjectSlug: slug,
          subjectName: subject.name,
          subjectCode: subject.code,
          packageId: data.packageId ?? packageId ?? null,
          packageName: data.packageName ?? null,
          mode,
          difficulty,
          totalQuestions: sessionQuestions.length,
          currentIndex: 0,
          questions: sessionQuestions,
          answers: {}, // { [questionIndex]: 'A' | 'B' | 'C' | 'D' | 'E' }
          flagged: {}, // { [questionIndex]: true }
          timeRemainingSeconds: mode === "Timed Practice" ? sessionQuestions.length * 90 : null,
          isTimerRunning: mode === "Timed Practice",
          startTime: Date.now(),
        };

        setSessionResults(null);
        setActiveSession(session);
        setCurrentTab("practice");
      } catch (err) {
        showToast("GAGAL MEMUAT SOAL", err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [topics, setCurrentTab],
  );

  // Select Answer
  const selectAnswer = (questionIndex, optionKey) => {
    if (submitLock.current) return;
    sound.playSelect();
    setActiveSession((prev) => {
      if (!prev) return null;
      if (prev.attemptId || prev.isEvaluated) return prev;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionIndex]: optionKey,
        },
      };
    });
  };

  // Toggle Flag
  const toggleFlag = (questionIndex) => {
    sound.playClick();
    setActiveSession((prev) => {
      if (!prev) return null;
      const isFlagged = !prev.flagged[questionIndex];
      const newFlags = { ...prev.flagged };
      if (isFlagged) {
        newFlags[questionIndex] = true;
      } else {
        delete newFlags[questionIndex];
      }
      return {
        ...prev,
        flagged: newFlags,
      };
    });
  };

  // Finish and Evaluate Session — submits to API
  const finishSession = useCallback(async () => {
    if (!activeSession || activeSession.isEvaluated || submitLock.current) return;

    const apiAnswers = practiceAnswersToPayload(activeSession.questions, activeSession.answers);
    if (!apiAnswers) {
      setSubmissionError(
        "Jawab semua soal dalam sesi sebelum dikumpulkan. Jawabanmu tetap tersimpan selama sesi ini terbuka.",
      );
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmissionError("");
    let attemptId = activeSession.attemptId;

    try {
      if (IS_DEMO_MODE) {
        const correctCount = activeSession.questions.reduce(
          (count, question, index) => count + (activeSession.answers[index] === question.correctAnswer ? 1 : 0),
          0,
        );
        const unansweredCount = activeSession.questions.reduce(
          (count, _question, index) => count + (activeSession.answers[index] ? 0 : 1),
          0,
        );
        const incorrectCount = activeSession.totalQuestions - correctCount - unansweredCount;
        const accuracy = activeSession.totalQuestions
          ? Math.round((correctCount / activeSession.totalQuestions) * 100)
          : 0;
        const earnedXP = correctCount * 10;
        const demoAttemptId = attemptId || `demo-${crypto.randomUUID()}`;
        const completedAt = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        });
        const results = {
          attemptId: demoAttemptId,
          subjectId: activeSession.subjectId,
          subjectName: activeSession.subjectName,
          subjectCode: activeSession.subjectCode,
          packageId: activeSession.packageId,
          packageName: activeSession.packageName,
          mode: activeSession.mode,
          difficulty: activeSession.difficulty,
          totalQuestions: activeSession.totalQuestions,
          correctCount,
          incorrectCount,
          unansweredCount,
          accuracy,
          score: accuracy,
          earnedXP,
          answers: activeSession.answers,
          questions: activeSession.questions,
          completedAt,
        };
        const historyItem = {
          id: demoAttemptId,
          slug: activeSession.subjectSlug,
          topic: activeSession.subjectName,
          packageId: activeSession.packageId,
          packageName: activeSession.packageName,
          total: activeSession.totalQuestions,
          correct: correctCount,
          earnedXP,
          submittedAt: new Date().toISOString(),
          accuracy,
        };
        saveDemoResult(results, historyItem);
        sound.playSuccess();
        setSessionResults(results);
        setActiveSession((previous) => ({
          ...previous,
          attemptId: demoAttemptId,
          isEvaluated: true,
          currentIndex: 0,
          results,
        }));
        setHistory((previous) => [historyItem, ...previous.filter((item) => item.id !== demoAttemptId)].slice(0, 100));
        setUser((previous) => ({
          ...previous,
          recentActivities: [
            {
              id: demoAttemptId,
              code: activeSession.subjectCode,
              subject: activeSession.subjectName,
              title: `Selesai ${activeSession.totalQuestions} soal ${activeSession.subjectName}`,
              xp: earnedXP,
              time: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }),
              accuracy: `${accuracy}%`,
            },
            ...(previous.recentActivities || []).filter((item) => item.id !== demoAttemptId),
          ].slice(0, 6),
        }));
        await refreshSummary().catch(() => {});
        return;
      }

      if (!attemptId) {
        const endpoint = activeSession.packageId
          ? `/learner/practice/${activeSession.subjectSlug}/${activeSession.packageId}`
          : `/learner/practice/${activeSession.subjectSlug}`;
        const saved = await api(endpoint, {
          method: "POST",
          body: JSON.stringify({
            submissionId: activeSession.submissionId,
            answers: apiAnswers,
            packageId: activeSession.packageId || undefined,
          }),
        });
        attemptId = saved.id;
        setActiveSession((prev) => ({ ...prev, attemptId }));
      }
      const reviewData = await api(`/learner/results/${attemptId}`);
      if (
        reviewData.answers.length !== activeSession.questions.length ||
        activeSession.questions.some(
          (q) =>
            !reviewData.answers.some(
              (answer) =>
                answer.id === q.id &&
                Number.isInteger(answer.correctAnswer) &&
                answer.correctAnswer >= 0 &&
                answer.correctAnswer < q.options.length &&
                typeof answer.explanation === "string",
            ),
        )
      ) {
        throw new Error("Hasil belum lengkap. Coba muat hasil lagi.");
      }

      // Merge correct answers + explanations into session questions
      const enrichedQuestions = mergeReviewData(activeSession.questions, reviewData.answers);

      // Calculate results from review data
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      activeSession.questions.forEach((q, idx) => {
        const userAns = activeSession.answers[idx];
        const reviewQ = reviewData.answers.find((ra) => ra.id === q.id);
        if (!userAns) {
          unansweredCount++;
        } else if (reviewQ && INDEX_TO_KEY.indexOf(userAns) === reviewQ.correctAnswer) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });

      const accuracy = Math.round((correctCount / activeSession.totalQuestions) * 100);
      const score = accuracy;
      const earnedXP = reviewData.attempt.earnedXP;

      const results = {
        attemptId,
        subjectId: activeSession.subjectId,
        subjectName: activeSession.subjectName,
        subjectCode: activeSession.subjectCode,
        packageId: activeSession.packageId,
        packageName: activeSession.packageName,
        mode: activeSession.mode,
        difficulty: activeSession.difficulty,
        totalQuestions: activeSession.totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy,
        score,
        earnedXP,
        answers: activeSession.answers,
        questions: enrichedQuestions,
        completedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      sound.playSuccess();

      setSessionResults(results);
      setActiveSession((prev) => ({
        ...prev,
        questions: enrichedQuestions,
        isEvaluated: true,
        currentIndex: 0,
        results,
      }));

      // Refresh summary and history in background
      refreshSummary()
        .then((data) => {
          if (data.level > user.level)
            showToast(
              `Level ${data.level} unlocked!`,
              `Total ${data.totalXP} EXP dari drilling.`,
              "level-up",
            );
        })
        .catch(() =>
          showToast(
            "Progres belum dapat dimuat",
            "Progres latihan sudah tersimpan. Muat ulang halaman untuk mencoba lagi.",
            "error",
          ),
        );

      api("/learner/history")
        .then((data) => {
          if (Array.isArray(data)) {
            setHistory(data);
            const recentActivities = data.slice(0, 6).map((h) => {
              const short = SLUG_TO_SHORT[h.slug] || h.slug;
              return {
                id: h.id,
                code: short,
                subject: h.topic,
                title: `Selesai ${h.total} Soal ${h.topic}`,
                xp: h.earnedXP ?? practiceXP(h.correct),
                time: new Date(h.submittedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : "0%",
              };
            });
            if (recentActivities.length > 0) {
              setUser((prev) => ({ ...prev, recentActivities }));
            }
          }
        })
        .catch(() => {});
    } catch (err) {
      setSubmissionError(
        `${attemptId ? "Jawaban sudah tersimpan, tetapi hasil belum dapat dimuat." : "Jawaban belum berhasil dikumpulkan."} ${err.message} Coba lagi.`,
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }, [activeSession, refreshSummary, user.level]);

  // Exit Session
  const exitPractice = () => {
    if (submitLock.current) return;
    sound.playClick();
    setActiveSession(null);
    setSessionResults(null);
    setSubmissionError("");
  };

  // Mark Daily Training task as completed directly
  // ponytail: daily training is still mock-only, no API
  const completeDailyTraining = (taskId) => {
    sound.playSuccess();
    setUser((prev) => ({
      ...prev,
      todayTraining: prev.todayTraining.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t,
      ),
    }));
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        theme,
        setTheme,
        soundEnabled,
        setSoundEnabled,
        user,
        setUser,
        profileLoaded,
        profileError,
        loadProfile,
        topics,
        topicsLoading,
        topicsError,
        setTopics,
        refreshTopics,
        summary,
        refreshSummary,
        history,
        loading,
        submitting,
        submissionError,
        toasts,
        showToast,
        lexiconState,
        openLexicon,
        closeLexicon,
        activeSession,
        setActiveSession,
        sessionResults,
        setSessionResults,
        startPractice,
        fetchSubtestPackages,
        selectAnswer,
        toggleFlag,
        finishSession,
        exitPractice,
        completeDailyTraining,
        sidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);