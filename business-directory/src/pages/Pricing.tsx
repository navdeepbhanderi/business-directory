import { useState } from 'react';
import { Check, Star, CreditCard, Smartphone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authSlice';
import { getPricingPlans } from '@/lib/api';
import { useAsync } from '@/lib/hooks';
import { toast } from 'sonner';

export default function Pricing() {
  const { user, setPremium } = useAuthStore();
  const [isSubscribeDialogOpen, setIsSubscribeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string>('card');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: plans, loading } = useAsync(getPricingPlans, []);

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) return;

    try {
      setIsSubscribing(true);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user premium status
      setPremium(true);
      setIsSubscribeDialogOpen(false);
      setSelectedPlan(null);
      
      toast.success('Subscription successful! Welcome to Premium!');
    } catch (error) {
      toast.error('Subscription failed. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const getFeatures = (planId: string) => {
    const baseFeatures = [
      'Basic listing',
      'Up to 5 photos',
      'Contact information',
      'Business hours'
    ];

    if (planId === 'premium') {
      return [
        ...baseFeatures,
        'Enhanced listing',
        'Up to 20 photos',
        'Video support',
        'Priority placement',
        'Analytics dashboard',
        'Customer reviews management',
        'Social media integration',
        'Email support'
      ];
    }

    if (planId === 'enterprise') {
      return [
        ...baseFeatures,
        'Premium listing',
        'Unlimited photos & videos',
        'Top placement',
        'Advanced analytics',
        'Multi-location support',
        'Custom branding',
        'API access',
        'Dedicated support',
        'White-label options',
        'Custom integrations'
      ];
    }

    return baseFeatures;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-96 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Select the perfect plan for your business needs
          </p>
          
          {user?.premium && (
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">Premium Active</span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans?.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.id === 'premium' 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'hover:shadow-md transition-shadow'
              }`}
            >
              {plan.id === 'premium' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {plan.priceMonthly === 0 ? 'Free' : `BD ${plan.priceMonthly}`}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.id === 'basic' && 'Perfect for getting started'}
                  {plan.id === 'premium' && 'Best for growing businesses'}
                  {plan.id === 'enterprise' && 'For established businesses'}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {getFeatures(plan.id).map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4">
                  {user?.role === 'guest' ? (
                    <Button 
                      variant={plan.id === 'premium' ? 'default' : 'outline'} 
                      className="w-full"
                      disabled
                    >
                      Sign In to Subscribe
                    </Button>
                  ) : plan.id === 'basic' ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : user?.premium ? (
                    <Button variant="outline" className="w-full" disabled>
                      Premium Active
                    </Button>
                  ) : (
                    <Dialog open={isSubscribeDialogOpen} onOpenChange={setIsSubscribeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant={plan.id === 'premium' ? 'default' : 'outline'} 
                          className="w-full"
                          onClick={() => setSelectedPlan(plan.id)}
                        >
                          {plan.priceMonthly === 0 ? 'Get Started' : 'Subscribe Now'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Plan Summary */}
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{plan.name}</span>
                              <span className="font-bold">
                                {plan.priceMonthly === 0 ? 'Free' : `BD ${plan.priceMonthly}/month`}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Billed monthly • Cancel anytime
                            </p>
                          </div>

                          {/* Payment Gateway Selection */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Payment Method</Label>
                            <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway}>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="card" id="card" />
                                <Label htmlFor="card" className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Credit/Debit Card
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="benefit" id="benefit" />
                                <Label htmlFor="benefit" className="flex items-center gap-2">
                                  <Smartphone className="h-4 w-4" />
                                  BenefitPay
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="stripe" id="stripe" />
                                <Label htmlFor="stripe" className="flex items-center gap-2">
                                  <Globe className="h-4 w-4" />
                                  Stripe
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Demo Notice */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                              <strong>Demo Mode:</strong> This is a demonstration. No real payment will be processed.
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => setIsSubscribeDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              className="flex-1"
                              onClick={handleSubscribe}
                              disabled={isSubscribing}
                            >
                              {isSubscribing ? 'Processing...' : 'Subscribe Now'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-center">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Features</th>
                    <th className="text-center py-3 px-4">Basic</th>
                    <th className="text-center py-3 px-4">Premium</th>
                    <th className="text-center py-3 px-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Monthly Price</td>
                    <td className="text-center py-3 px-4">Free</td>
                    <td className="text-center py-3 px-4">BD 29</td>
                    <td className="text-center py-3 px-4">BD 99</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Photos</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4">20</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Videos</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">✓</td>
                    <td className="text-center py-3 px-4">✓</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Analytics</td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Advanced</td>
                    <td className="text-center py-3 px-4">Advanced</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Support</td>
                    <td className="text-center py-3 px-4">Community</td>
                    <td className="text-center py-3 px-4">Email</td>
                    <td className="text-center py-3 px-4">Dedicated</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">API Access</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-sm text-muted-foreground">
                  All paid plans come with a 14-day free trial. No credit card required to start.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards, BenefitPay, and Stripe payments.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}