import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Building2, FileText, Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { submitClaim } from '@/lib/api';
import { toast } from 'sonner';

interface ClaimFormData {
  businessId: string;
  businessName: string;
  role: string;
  contactEmail: string;
  contactPhone: string;
  additionalInfo: string;
  tradeLicense: File | null;
  authorizationLetter: File | null;
}

export default function Claim() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [businessSearchOpen, setBusinessSearchOpen] = useState(false);
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  
  const [formData, setFormData] = useState<ClaimFormData>({
    businessId: '',
    businessName: '',
    role: '',
    contactEmail: '',
    contactPhone: '',
    additionalInfo: '',
    tradeLicense: null,
    authorizationLetter: null,
  });

  const steps = [
    { id: 1, title: 'Business Selection', description: 'Select the business you want to claim' },
    { id: 2, title: 'Ownership Verification', description: 'Provide your role and contact information' },
    { id: 3, title: 'Document Upload', description: 'Upload required documents' },
    { id: 4, title: 'Review & Submit', description: 'Review your information and submit' },
  ];

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      // Mock businesses for demo
      setBusinesses([
        { id: '1', name: 'Mama Nouvelle', address: 'Adliya' },
        { id: '2', name: 'Al Dar Restaurant', address: 'Manama' },
        { id: '3', name: 'Bahrain Medical Center', address: 'Riffa' }
      ]);
    } catch (error) {
      console.error('Failed to load businesses:', error);
      toast.error('Failed to load businesses');
    }
  };

  const filteredBusinesses = businesses.filter(business =>
    business.name.toLowerCase().includes(businessSearchQuery.toLowerCase()) ||
    business.address.city.toLowerCase().includes(businessSearchQuery.toLowerCase())
  );

  const handleBusinessSelect = (business: any) => {
    setFormData(prev => ({
      ...prev,
      businessId: business.id,
      businessName: business.name,
    }));
    setBusinessSearchOpen(false);
    setBusinessSearchQuery('');
  };

  const handleInputChange = (field: keyof ClaimFormData, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };


  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.businessId && formData.businessName;
      case 2:
        return formData.role && formData.contactEmail && formData.contactPhone;
      case 3:
        return true; // Documents are optional in demo
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const claimData = {
        businessId: formData.businessId,
        businessName: formData.businessName,
        role: formData.role,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        additionalInfo: formData.additionalInfo,
        documents: {
          tradeLicense: formData.tradeLicense ? 'uploaded' : 'pending',
          authorizationLetter: formData.authorizationLetter ? 'uploaded' : 'pending',
        },
      };

      const result = await submitClaim(claimData);
      setClaimId(result.id);
      setCurrentStep(5); // Success step
      toast.success('Claim submitted successfully!');
    } catch (error) {
      console.error('Failed to submit claim:', error);
      toast.error('Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Business to Claim</h3>
              <p className="text-muted-foreground mb-4">
                Search for the business you want to claim ownership of.
              </p>
            </div>

            <Popover open={businessSearchOpen} onOpenChange={setBusinessSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {formData.businessName || 'Search for a business...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search businesses..."
                    value={businessSearchQuery}
                    onValueChange={setBusinessSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No businesses found.</CommandEmpty>
                    <CommandGroup>
                      {filteredBusinesses.map(business => (
                        <CommandItem
                          key={business.id}
                          onSelect={() => handleBusinessSelect(business)}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4" />
                            <div>
                              <p className="font-medium">{business.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {business.address.city}
                              </p>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {formData.businessName && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">{formData.businessName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Ready to claim this business
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Ownership Information</h3>
              <p className="text-muted-foreground mb-4">
                Provide your role and contact information to verify ownership.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Role</label>
                <Select value={formData.role} onValueChange={(value: any) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="authorized-representative">Authorized Representative</SelectItem>
                    <SelectItem value="legal-representative">Legal Representative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contact Email</label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.contactEmail}
                  onChange={(e: any) => handleInputChange('contactEmail', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contact Phone</label>
                <Input
                  type="tel"
                  placeholder="+973 1234 5678"
                  value={formData.contactPhone}
                  onChange={(e: any) => handleInputChange('contactPhone', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Additional Information (Optional)</label>
                <Textarea
                  placeholder="Any additional information that might help verify your ownership..."
                  value={formData.additionalInfo}
                  onChange={(e: any) => handleInputChange('additionalInfo', e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Required Documents</h3>
              <p className="text-muted-foreground mb-4">
                Upload the required documents to verify your ownership claim.
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Trade License
                    <Badge variant="outline">Required</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload your trade license document
                    </p>
                    <Button variant="outline" disabled>
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Demo only: File upload disabled
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Authorization Letter
                    <Badge variant="outline">Required</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload authorization letter from business owner
                    </p>
                    <Button variant="outline" disabled>
                      Choose File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Demo only: File upload disabled
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Your Claim</h3>
              <p className="text-muted-foreground mb-4">
                Please review your information before submitting your claim.
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Name:</span>
                      <span className="font-medium">{formData.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your Role:</span>
                      <span className="font-medium capitalize">{formData.role.replace('-', ' ')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{formData.contactEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{formData.contactPhone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {formData.additionalInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{formData.additionalInfo}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trade License:</span>
                      <Badge variant="outline">Pending Upload</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Authorization Letter:</span>
                      <Badge variant="outline">Pending Upload</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold mb-2">Claim Submitted Successfully!</h3>
              <p className="text-muted-foreground mb-4">
                Your business claim has been submitted and is under review.
              </p>
            </div>

            <Card className="max-w-md mx-auto">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Claim ID:</span>
                    <span className="font-mono font-medium">{claimId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Business:</span>
                    <span className="font-medium">{formData.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge>Under Review</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We'll review your claim and contact you within 2-3 business days.
                You can check the status of your claim in your dashboard.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Back to Home
                </Button>
                <Button onClick={() => navigate('/owner/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (currentStep === 5) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {renderStepContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold mb-2">Claim Your Business</h1>
          <p className="text-muted-foreground">
            Take control of your business listing and manage your online presence.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/25'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">{steps[currentStep - 1].title}</h2>
            <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
          </div>
          
          <Progress value={(currentStep / 4) * 100} className="mt-4" />
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep === 4 ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}