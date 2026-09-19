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
        className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-navy text-white text-sm font-bold hover:bg-navy-dark transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
      >
        <Send className="w-4 h-4 text-teal" />
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
