"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";
import { RequestTutorModal, type OptionItem } from "./RequestTutorModal";

interface TutorProfileClientProps {
  tutorId: string;
  tutorName: string;
  subjects: OptionItem[];
  classes: OptionItem[];
  isAuthenticated: boolean;
}

export function TutorProfileClient({
  tutorId,
  tutorName,
  subjects,
  classes,
  isAuthenticated,
}: TutorProfileClientProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="tutr-btn-student py-3 px-8 text-sm w-full sm:w-auto flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        <span>Request This Tutor</span>
      </button>

      {modalOpen && (
        <RequestTutorModal
          tutorId={tutorId}
          tutorName={tutorName}
          subjects={subjects}
          classes={classes}
          isAuthenticated={isAuthenticated}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
