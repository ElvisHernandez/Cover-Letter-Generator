import { equalTo, onValue, orderByChild, query, ref } from "firebase/database";
import jsPDF from "jspdf";
import { useEffect, useState } from "react";

import { db } from "~context";
import { useView } from "~context/Provider";

type CoverLetter = {
  userUid: string;
  content: string;
  timestamp: number;
};

const letters = (() => {
  const res = [];

  for (let i = 0; i < 100; i++) {
    res.push({
      content: "FFSsdfssdgsgsdgsdgdsdsgsdvxvxcvxcvxcvxcvxcxcbxcbxcbgsdg"
    });
  }

  return res;
})();

export const CoverLettersScreen = () => {
  const { user } = useView();
  const [paginatedCoverLetters, setPaginatedCoverLetters] = useState<
    Array<CoverLetter[]>
  >([]);
  const [currentPage, setCurrentPage] = useState(0);

  const getCoverLetters = async () => {
    try {
      const coverLettersRef = query(
        ref(db, "coverLetters")
        // orderByChild("userUid"),
        // equalTo(user.uid)
      );

      onValue(coverLettersRef, (snapshot) => {
        const coverLetters = snapshot.val();
        console.log("In the cover letters");
        console.log(coverLetters);
        if (coverLetters) {
          const paginatedCoverLetters = Object.values(coverLetters).reduce<
            Array<CoverLetter[]>
          >(
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
          console.log("Paginated cover letters: ", paginatedCoverLetters);
          setPaginatedCoverLetters(paginatedCoverLetters);
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const exportPdf = async (converLetterContent: string) => {
    const pdf = new jsPDF({});
    pdf.setFontSize(12);
    const pageWidth = pdf.internal.pageSize.getWidth() - 20;
    const splittedText = pdf.splitTextToSize(converLetterContent, pageWidth);

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

  if (!paginatedCoverLetters.length) {
    return (
      <div>
        <p>You have no saved cover letters yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      {paginatedCoverLetters[currentPage].map((coverLetter) => (
        <div className="collapse collapse-arrow bg-base-200 w-full">
          <input type="radio" name="my-accordion-2" />
          <div className="collapse-title text-xl font-medium flex justify-between">
            {coverLetter.content.slice(0, 20)}...
            <div className="z-20">
              <button
                className="btn btn-info normal-case z-20 mr-2"
                onClick={() => exportPdf(coverLetter.content)}>
                Export PDF
              </button>
              <button className="btn btn-info normal-case z-20">
                Export DOCX
              </button>
            </div>
          </div>
          <div className="collapse-content">
            <textarea
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
