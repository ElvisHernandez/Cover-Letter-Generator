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

export const CoverLettersScreen = () => {
  const { user } = useView();
  const [coverLetters, setCoverLetters] = useState<Array<CoverLetter>>([]);
  const [currentlySelectedCoverLetter, setCurrentlySelectedCoverLetter] =
    useState<CoverLetter>();

  const getCoverLetters = async () => {
    console.log("In the getCoverLetters function");
    try {
      const coverLettersRef = query(
        ref(db, "coverLetters"),
        orderByChild("userUid"),
        equalTo(user.uid)
      );

      console.log("b");

      onValue(coverLettersRef, (snapshot) => {
        console.log("c");
        const coverLetters = snapshot.val();
        console.log("d");
        console.log(user);
        console.log(coverLetters);
        if (coverLetters) {
          console.log("e");
          setCoverLetters(Object.values(coverLetters));
          console.log("f");
        }
      });
    } catch (e) {
      console.log("g");
      console.error(e);
    }
  };

  useEffect(() => {
    console.log("In the thing!");
    getCoverLetters();
  }, []);

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

  return (
    <div className="w-full h-screen">
      {coverLetters.map((coverLetter) => (
        <div className="collapse collapse-arrow bg-base-200 w-full">
          <input type="radio" name="my-accordion-2" />
          <div className="collapse-title text-xl font-medium flex justify-between">
            {coverLetter.content.slice(0, 50)}...
            <details className="dropdown z-10">
              <summary
                className={`m-1 btn btn-success z-10 relative ${
                  !!currentlySelectedCoverLetter ? "" : "opacity-70"
                }`}>
                Export
              </summary>
              <ul
                style={{ position: "fixed" }}
                className="p-2 shadow menu dropdown-content z-[10] bg-base-100 rounded-box w-52">
                <li onClick={() => exportPdf(coverLetter.content)}>
                  <a>PDF</a>
                </li>
                <li>
                  <a>DOCX</a>
                </li>
              </ul>
            </details>
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
    </div>
  );
};
