import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, Send } from "lucide-react";
import { Link } from "wouter";

export default function DMCATakedown() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Copyright holder information
    name: "",
    email: "",
    phone: "",
    address: "",
    
    // Copyrighted work description
    workDescription: "",
    originalWorkUrl: "",
    
    // Infringing content
    infringingUrl: "",
    infringingDescription: "",
    
    // Statements
    goodFaithBelief: false,
    accuracyStatement: false,
    digitalSignature: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields - all fields are now mandatory
    const requiredFields = [
      'name', 'email', 'phone', 'address', 'workDescription', 'originalWorkUrl',
      'infringingUrl', 'infringingDescription', 'goodFaithBelief', 'accuracyStatement', 'digitalSignature'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields marked with *",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Send to backend API
      const response = await fetch('/api/dmca/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: "DMCA Takedown Request Submitted",
          description: "We have received your request and will review it within 2-3 business days. You will receive an email confirmation shortly.",
        });
        
        // Reset form
        setFormData({
          name: "", email: "", phone: "", address: "",
          workDescription: "", originalWorkUrl: "",
          infringingUrl: "", infringingDescription: "",
          goodFaithBelief: false, accuracyStatement: false, digitalSignature: ""
        });
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again or contact us directly at dmca@spokify.com",
        variant: "destructive"
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen spotify-bg pb-20">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/terms-of-service" className="mr-4">
            <ArrowLeft className="h-6 w-6 spotify-text-muted hover:spotify-text-primary transition-colors" />
          </Link>
          <div>
            <h1 className="spotify-heading-lg">DMCA Takedown Request</h1>
            <p className="spotify-text-muted">Report copyright infringement</p>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="spotify-card p-6 mb-6 border-l-4 border-yellow-500">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="spotify-heading-md text-yellow-400 mb-2">Important Notice</h3>
              <p className="spotify-text-secondary text-sm mb-2">
                This form is for reporting copyright infringement only. Submitting false or 
                misleading information may result in legal consequences.
              </p>
              <p className="spotify-text-secondary text-sm">
                If you are not the copyright owner or authorized to act on their behalf, 
                please do not submit this form.
              </p>
            </div>
          </div>
        </div>

        {/* DMCA Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Copyright Holder Information */}
          <div className="spotify-card p-6">
            <h2 className="spotify-heading-md mb-4">Copyright Holder Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                  placeholder="Your full legal name"
                  required
                />
              </div>
              
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
              
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  Mailing Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                  placeholder="123 Main St, City, State, Country"
                  required
                />
              </div>
            </div>
          </div>

          {/* Copyrighted Work Information */}
          <div className="spotify-card p-6">
            <h2 className="spotify-heading-md mb-4">Copyrighted Work Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  Description of Copyrighted Work *
                </label>
                <textarea
                  name="workDescription"
                  value={formData.workDescription}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)] resize-vertical"
                  placeholder="Describe the copyrighted work that is being infringed (e.g., song title, album, artist, publication, etc.)"
                  required
                />
              </div>
              
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  URL of Original Work *
                </label>
                <input
                  type="url"
                  name="originalWorkUrl"
                  value={formData.originalWorkUrl}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                  placeholder="https://example.com/original-work"
                  required
                />
              </div>
            </div>
          </div>

          {/* Infringing Content Information */}
          <div className="spotify-card p-6">
            <h2 className="spotify-heading-md mb-4">Infringing Content on Spokify</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  URL of Infringing Content *
                </label>
                <input
                  type="url"
                  name="infringingUrl"
                  value={formData.infringingUrl}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                  placeholder="https://spokify.com/lyrics/123 or song ID"
                  required
                />
              </div>
              
              <div>
                <label className="block spotify-text-primary font-medium mb-2">
                  Description of Infringing Content *
                </label>
                <textarea
                  name="infringingDescription"
                  value={formData.infringingDescription}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)] resize-vertical"
                  placeholder="Describe how the content on our site infringes your copyright"
                  required
                />
              </div>
            </div>
          </div>

          {/* Legal Statements */}
          <div className="spotify-card p-6">
            <h2 className="spotify-heading-md mb-4">Legal Statements</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="goodFaithBelief"
                  checked={formData.goodFaithBelief}
                  onChange={handleInputChange}
                  className="mt-1 accent-[var(--spotify-green)]"
                  required
                />
                <label className="spotify-text-secondary text-sm">
                  I have a good faith belief that the use of the copyrighted material described above 
                  is not authorized by the copyright owner, its agent, or the law. *
                </label>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="accuracyStatement"
                  checked={formData.accuracyStatement}
                  onChange={handleInputChange}
                  className="mt-1 accent-[var(--spotify-green)]"
                  required
                />
                <label className="spotify-text-secondary text-sm">
                  I swear, under penalty of perjury, that the information in this notification is 
                  accurate and that I am the copyright owner or am authorized to act on behalf of 
                  the owner of an exclusive right that is allegedly infringed. *
                </label>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block spotify-text-primary font-medium mb-2">
                Digital Signature *
              </label>
              <input
                type="text"
                name="digitalSignature"
                value={formData.digitalSignature}
                onChange={handleInputChange}
                className="w-full p-3 bg-[var(--spotify-light-gray)] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--spotify-green)]"
                placeholder="Type your full legal name as digital signature"
                required
              />
              <p className="spotify-text-muted text-xs mt-1">
                Typing your name here constitutes a legal digital signature
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="spotify-btn-primary px-8 py-3 min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit DMCA Request
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Contact Information */}
        <div className="spotify-card p-6 mt-8">
          <h2 className="spotify-heading-md mb-4">Alternative Contact Methods</h2>
          <div className="spotify-text-secondary text-sm space-y-2">
            <p><strong>Email:</strong> dmca@spokify.com</p>
            <p><strong>DMCA Agent:</strong> Spokify Legal Team</p>
            <p><strong>Response Time:</strong> We typically respond within 2-3 business days</p>
          </div>
        </div>
      </div>
    </div>
  );
}