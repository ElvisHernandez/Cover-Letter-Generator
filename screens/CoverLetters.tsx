import deleteIcon from "data-base64:~assets/delete-icon.svg";
import docxIcon from "data-base64:~assets/docx-icon.svg";
import pdfIcon from "data-base64:~assets/pdf-icon.svg";
import saveIcon from "data-base64:~assets/save-icon.svg";
import { Document, Packer, Paragraph } from "docx";
import {
  equalTo,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
  update
} from "firebase/database";
import jsPDF from "jspdf";
import { useEffect, useRef, useState } from "react";

import { db } from "~context";
import { useView } from "~context/Provider";

type CoverLetter = {
  userUid: string;
  content: string;
  timestamp: number;
  key: string;
};

export const CoverLettersScreen = () => {
  const { user, setPage } = useView();
  const [paginatedCoverLetters, setPaginatedCoverLetters] = useState<
    Array<CoverLetter[]>
  >([]);
  const [currentPage, setCurrentPage] = useState(0);
  const coverLetterRef = useRef<HTMLTextAreaElement>();

  const getCoverLetters = async () => {
    try {
      const coverLettersRef = query(
        ref(db, "coverLetters"),
        orderByChild("userUid"),
        equalTo(user.uid)
      );

      onValue(
        coverLettersRef,
        (snapshot) => {
          const coverLetters = snapshot.val();

          if (coverLetters) {
            const paginatedCoverLetters = Object.entries(coverLetters)
              .map(([key, coverLetter]) => ({
                ...(coverLetter as CoverLetter),
                key
              }))
              .reduce<Array<CoverLetter[]>>(
                (acc, coverLetter) => {
                  const page = acc[acc.length - 1];

                  if (page.length === 5) {
                    acc.push([coverLetter as CoverLetter]);
                  } else {
                    page.push(coverLetter as CoverLetter);
                  }

                  return acc;
                },
                [[]]
              );
            setPaginatedCoverLetters(paginatedCoverLetters);
          } else {
            setPaginatedCoverLetters([]);
          }
        },
        (error) => {
          console.error("Error fetching cover letters:", error);
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const exportPdf = async (coverLetterContent: string) => {
    const pdf = new jsPDF({});
    pdf.setFontSize(12);
    const pageWidth = pdf.internal.pageSize.getWidth() - 20;
    const splittedText = pdf.splitTextToSize(coverLetterContent, pageWidth);

    let yPos = 20; // Initial vertical position
    const lineHeight = 7; // Height for each line
    const pageHeight = pdf.internal.pageSize.getHeight() - 20; // Adjust bottom margin as required

    splittedText.forEach((line: string) => {
      if (yPos + lineHeight > pageHeight) {
        pdf.addPage();
        yPos = 20; // Reset y position for the new page
      }

      pdf.text(line, 10, yPos); // (string, x-coordinate, y-coordinate)
      yPos += lineHeight; // Move the y position down for next line
    });
    pdf.save("cover-letter.pdf");
  };

  const exportDocx = async (coverLetterContent: string) => {
    try {
      const paragraphs = coverLetterContent.split("\n\n");

      const docChildren = paragraphs.flatMap((para, index) => {
        // For each paragraph, add the paragraph itself followed by a newline (except for the last paragraph)
        return index !== paragraphs.length - 1
          ? [new Paragraph(para), new Paragraph("")]
          : [new Paragraph(para)];
      });
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren
          }
        ]
      });

      const docBlob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(docBlob);
      window.location.href = url;
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getCoverLetters();
  }, []);

  const goToPreviousPage = () => {
    if (currentPage === 0) return;
    setCurrentPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage === paginatedCoverLetters.length - 1) return;
    setCurrentPage((prev) => prev + 1);
  };

  const saveCoverLetter = async (coverLetter: CoverLetter) => {
    try {
      await update(ref(db, `coverLetters/${coverLetter.key}`), {
        content: coverLetterRef.current?.value ?? coverLetter.content
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCoverLetter = async (coverLetterKey: string) => {
    try {
      await remove(ref(db, `coverLetters/${coverLetterKey}`));
    } catch (e) {
      console.error(e);
    }
  };

  if (!paginatedCoverLetters.length) {
    return (
      <div>
        <p>You have no saved cover letters yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {paginatedCoverLetters[currentPage].map((coverLetter) => (
        <div className="collapse collapse-arrow bg-base-200 w-full">
          <input type="radio" name="my-accordion-2" />
          <div className="collapse-title text-xl font-medium flex justify-between">
            {coverLetter.content.slice(0, 20)}...
            <div className="flex items-center gap-2">
              <img
                title="Delete"
                src={deleteIcon}
                onClick={() => deleteCoverLetter(coverLetter.key)}
                className="w-[21px] h-[21px] z-10 cursor-pointer"
              />
              <img
                src={pdfIcon}
                title="Export PDF"
                onClick={() => exportPdf(coverLetter.content)}
                className="w-[20px] h-[20px] z-10 cursor-pointer"
              />
              <img
                src={docxIcon}
                title="Export DOCX"
                onClick={() => exportDocx(coverLetter.content)}
                className="w-[20px] h-[20px] z-10 cursor-pointer"
              />
              <img
                title="Save"
                src={saveIcon}
                onClick={() => saveCoverLetter(coverLetter)}
                className="w-[19px] h-[19px] z-10 cursor-pointer"
              />
            </div>
          </div>
          <div className="collapse-content">
            <textarea
              ref={(node: HTMLTextAreaElement) => {
                coverLetterRef.current = node;
              }}
              className="textarea textarea-bordered w-full h-screen whitespace-pre-line p-[24px]"
              placeholder="Cover Letter">
              {coverLetter.content}
            </textarea>
          </div>
        </div>
      ))}
      <div className="flex justify-end w-full">
        <div className="join">
          <button
            disabled={currentPage === 0}
            className={`join-item btn`}
            onClick={goToPreviousPage}>
            «
          </button>
          <button className="join-item btn">Page {currentPage + 1}</button>
          <button
            disabled={currentPage === paginatedCoverLetters.length - 1}
            className={`join-item btn`}
            onClick={goToNextPage}>
            »
          </button>
        </div>
      </div>
    </div>
  );
};
