import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { getCategories, registerBusiness } from '@/lib/api';
import { toast } from 'sonner';

interface BusinessFormData {
  name: string;
  description: string;
  categories: string[];
  address: {
    line1: string;
    city: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  hours: {
    [key: string]: Array<{ open: string; close: string }>;
  };
  services: Array<{
    name: string;
    priceMin: number;
    priceMax: number;
    durationMin: number;
  }>;
  media: {
    logo: File | null;
    photos: File[];
  };
}

export default function Register() {
  const navigate = useNavigate();
  const [currentStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<BusinessFormData>({
    name: '',
    description: '',
    categories: [],
    address: {
      line1: '',
      city: '',
      country: 'BH',
      postalCode: '',
    },
    contact: {
      phone: '',
      email: '',
      website: '',
    },
    hours: {
      sun: [],
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
    },
    services: [],
    media: {
      logo: null,
      photos: [],
    },
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleSubmit = async () => {
    try {
      await registerBusiness(formData);
      toast.success('Business registration submitted successfully!');
      navigate('/owner/dashboard');
    } catch (error) {
      console.error('Failed to submit registration:', error);
      toast.error('Failed to submit registration');
    }
  };

  if (currentStep === 7) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Registration Submitted!</h1>
              <p className="text-muted-foreground">
                Your business registration has been submitted successfully. 
                We'll review it and get back to you within 2-3 business days.
              </p>
            </div>
            <Button onClick={() => navigate('/owner/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Register Your Business</h1>
            <p className="text-muted-foreground mt-2">
              Step {currentStep} of 6: Business Details
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Business Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your business"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Categories *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                categories: [...prev.categories, category.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                categories: prev.categories.filter(id => id !== category.id)
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    Submit Registration
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}