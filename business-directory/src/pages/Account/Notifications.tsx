import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, MapPin, Heart, Star, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authSlice';
import { toast } from 'sonner';

interface NotificationSettings {
  offers: boolean;
  reviewsOnBookmarked: boolean;
  locationPromotions: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

export default function Notifications() {
  const { user, role } = useAuthStore();
  const [settings, setSettings] = useState<NotificationSettings>({
    offers: true,
    reviewsOnBookmarked: true,
    locationPromotions: false,
    frequency: 'instant',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  });

  useEffect(() => {
    // Load saved settings from localStorage or API
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTestNotification = () => {
    toast.success('Test notification sent!', {
      description: 'This is how notifications will appear in your app.',
      duration: 4000,
    });
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    toast.success('Notification settings saved!');
  };

  if (role === 'guest' || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Notification Settings</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to manage your notification preferences.
          </p>
          <Button asChild>
            <a href="/auth/signin">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Account Navigation */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">My Account</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/account/lists" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                My Lists & Favorites
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/account/notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Notification Settings</h2>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications about businesses and offers.
          </p>
        </div>

        <div className="space-y-6">
          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="offers" className="text-base font-medium">
                      Special Offers & Promotions
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get notified about special offers and promotions from businesses you follow
                  </p>
                </div>
                <Switch
                  id="offers"
                  checked={settings.offers}
                  onCheckedChange={(checked: any) => handleSettingChange('offers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <Label htmlFor="reviewsOnBookmarked" className="text-base font-medium">
                      Reviews on Bookmarked Businesses
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone leaves a review on businesses you've bookmarked
                  </p>
                </div>
                <Switch
                  id="reviewsOnBookmarked"
                  checked={settings.reviewsOnBookmarked}
                  onCheckedChange={(checked: any) => handleSettingChange('reviewsOnBookmarked', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <Label htmlFor="locationPromotions" className="text-base font-medium">
                      Location-Based Promotions
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive promotions from businesses near your current location
                  </p>
                </div>
                <Switch
                  id="locationPromotions"
                  checked={settings.locationPromotions}
                  onCheckedChange={(checked: any) => handleSettingChange('locationPromotions', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Frequency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose how often you want to receive notifications
                </p>
                <RadioGroup 
                  value={settings.frequency} 
                  onValueChange={(value: any) => handleSettingChange('frequency', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="instant" id="instant" />
                    <Label htmlFor="instant" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Instant
                      <Badge variant="secondary">Recommended</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Daily Digest
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Weekly Summary
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Delivery Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="emailNotifications" className="text-base font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked: any) => handleSettingChange('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="pushNotifications" className="text-base font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="pushNotifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked: any) => handleSettingChange('pushNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="smsNotifications" className="text-base font-medium">
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via SMS (premium feature)
                  </p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked: any) => handleSettingChange('smsNotifications', checked)}
                  disabled={!user.premium}
                />
              </div>

              {!user.premium && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Premium Feature:</strong> SMS notifications are available with a premium subscription.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test your notification settings to see how they will appear
                </p>
                <Button onClick={handleTestNotification} variant="outline">
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} size="lg">
              Save Settings
            </Button>
          </div>

          {/* Current Settings Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Current Settings Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Notification Types</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      {settings.offers ? (
                        <Bell className="h-4 w-4 text-green-600" />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span>Special Offers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.reviewsOnBookmarked ? (
                        <Bell className="h-4 w-4 text-green-600" />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span>Reviews on Bookmarked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.locationPromotions ? (
                        <Bell className="h-4 w-4 text-green-600" />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span>Location Promotions</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Delivery & Frequency</h4>
                  <div className="space-y-1 text-sm">
                    <div>Frequency: <Badge variant="outline">{settings.frequency}</Badge></div>
                    <div>Email: <Badge variant={settings.emailNotifications ? "default" : "secondary"}>
                      {settings.emailNotifications ? "On" : "Off"}
                    </Badge></div>
                    <div>Push: <Badge variant={settings.pushNotifications ? "default" : "secondary"}>
                      {settings.pushNotifications ? "On" : "Off"}
                    </Badge></div>
                    <div>SMS: <Badge variant={settings.smsNotifications ? "default" : "secondary"}>
                      {settings.smsNotifications ? "On" : "Off"}
                    </Badge></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}