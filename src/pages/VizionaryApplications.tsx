import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase"; // Adjust path if needed
import emailjs from "@emailjs/browser";
import "./VizionaryApplications.css";

const VizionaryApplications = () => {
  const [legalName, setLegalName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [song1, setSong1] = useState<File | null>(null);
  const [song2, setSong2] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName || !artistName || !contactInfo || !song1 || !song2) {
      setError("All fields are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Upload song1 to Firebase Storage
      const song1Ref = ref(
        storage,
        `applications/${legalName}/song1_${song1.name}`
      );
      await uploadBytes(song1Ref, song1);
      const song1Url = await getDownloadURL(song1Ref);

      // Upload song2 to Firebase Storage
      const song2Ref = ref(
        storage,
        `applications/${legalName}/song2_${song2.name}`
      );
      await uploadBytes(song2Ref, song2);
      const song2Url = await getDownloadURL(song2Ref);

      // Prepare email data
      const templateParams = {
        legal_name: legalName,
        artist_name: artistName,
        contact_info: contactInfo,
        song1_url: song1Url,
        song2_url: song2Url,
        notes: notes, // Optional, will be empty if not provided
      };

      // Send email via EmailJS (replace with your actual IDs)
      // Note: Configure your EmailJS service and template in the dashboard to send emails to tmcarron7@gmail.com as the recipient.
      // EmailJS does not support dynamic recipients in code for security reasons; the 'to' address is set in your connected email service (e.g., Gmail).
      await emailjs.send(
        "service_e10zggf", // e.g., service_abc123
        "template_24ktcs5", // e.g., template_def456 (template should include {{legal_name}}, {{artist_name}}, {{contact_info}}, {{song1_url}}, {{song2_url}}, {{notes}})
        templateParams,
        "JC8dYIW2VXhZ55jLY" // e.g., user_ghi789
      );

      setSuccess(true);
      // Reset form
      setLegalName("");
      setArtistName("");
      setContactInfo("");
      setSong1(null);
      setSong2(null);
      setNotes("");
    } catch (err) {
      console.error("Submission error:", err);
      setError("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="VizionaryApplications">
      <section className="application-section">
        <h2 className="application-header">So you want to be a vizionary</h2>
        <form onSubmit={handleSubmit}>
          <h3>Legal Name</h3>
          <input
            type="text"
            name="legal-name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
          <h3>Artist Name</h3>
          <input
            type="text"
            name="artist-name"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
          />
          <h3>Contact Information</h3>
          <input
            type="text"
            name="contact-info"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="Email or Phone Number"
          />
          <h3>Two songs you think match the vibe of the site</h3>
          <label>Song 1:</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setSong1(e.target.files?.[0] || null)}
          />
          <label>Song 2:</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setSong2(e.target.files?.[0] || null)}
          />
          <h3>Additional Notes (Optional)</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information or notes..."
          />
          {error && <p className="error">{error}</p>}
          {success && (
            <p className="success">Application submitted successfully!</p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default VizionaryApplications;
