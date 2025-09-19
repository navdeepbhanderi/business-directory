import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, MessageSquare, DollarSign, Star,
  Search, MoreHorizontal, Ban, Unlock, Key,
  CheckCircle, XCircle, Eye, Edit, Trash2, Plus,
  AlertTriangle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authSlice';
import { 
  getUsers, getAdminQueues, getReportedReviews, getPricingPlans, getPremiumPlacements,
  banUser, unbanUser, resetPassword, approveListing, rejectListing, 
  dismissReport, removeReview
} from '@/lib/api';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  role: string;
  premium?: boolean;
  status?: 'active' | 'banned';
}

interface Claim {
  id: string;
  businessId: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  role: string;
  submittedAt: string;
  status: string;
}

interface ReportedReview {
  id: string;
  reviewId: string;
  reason: string;
  reportedBy: string;
  reportedAt: string;
  status: string;
}

export default function AdminConsole() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reportedReviews, setReportedReviews] = useState<ReportedReview[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [premiumPlacements, setPremiumPlacements] = useState<string[]>([]);
  
  // Filters and search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  
  // Dialogs
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    
    loadAdminData();
  }, [user, navigate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [usersData, queuesData, reviewsData, plansData, placementsData] = await Promise.all([
        getUsers(),
        getAdminQueues(),
        getReportedReviews(),
        getPricingPlans(),
        getPremiumPlacements()
      ]);
      
      setUsers(usersData);
      setClaims(queuesData.claims);
      setReportedReviews(reviewsData);
      setPricingPlans(plansData);
      setPremiumPlacements(placementsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      await banUser(userId);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: 'banned' } : user
      ));
      toast.success('User banned successfully');
    } catch (error) {
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await unbanUser(userId);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: 'active' } : user
      ));
      toast.success('User unbanned successfully');
    } catch (error) {
      toast.error('Failed to unban user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await resetPassword(userId);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleApproveListing = async (itemId: string, type: 'claim' | 'registration') => {
    try {
      await approveListing(itemId, type);
      setClaims(prev => prev.filter(claim => claim.id !== itemId));
      toast.success('Listing approved successfully');
    } catch (error) {
      toast.error('Failed to approve listing');
    }
  };

  const handleRejectListing = async () => {
    if (!selectedItem || !rejectReason.trim()) return;
    
    try {
      await rejectListing(selectedItem.id, rejectReason, 'claim');
      setClaims(prev => prev.filter(claim => claim.id !== selectedItem.id));
      setIsRejectDialogOpen(false);
      setSelectedItem(null);
      setRejectReason('');
      toast.success('Listing rejected successfully');
    } catch (error) {
      toast.error('Failed to reject listing');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await dismissReport(reportId);
      setReportedReviews(prev => prev.filter(report => report.id !== reportId));
      toast.success('Report dismissed');
    } catch (error) {
      toast.error('Failed to dismiss report');
    }
  };

  const handleRemoveReview = async (reviewId: string) => {
    try {
      await removeReview(reviewId);
      setReportedReviews(prev => prev.filter(report => report.reviewId !== reviewId));
      toast.success('Review removed');
    } catch (error) {
      toast.error('Failed to remove review');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || user.status === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need admin privileges to access this console.
          </p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Console</h1>
          <p className="text-muted-foreground">
            Manage users, listings, reviews, and platform settings.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Premium
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e: any) => setUserSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={userRoleFilter} onValueChange={(value: any) => setUserRoleFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userStatusFilter} onValueChange={(value: any) => setUserStatusFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{user.role}</Badge>
                            {user.premium && <Badge variant="secondary">Premium</Badge>}
                            {user.status === 'banned' && <Badge variant="destructive">Banned</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {user.status === 'banned' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnbanUser(user.id)}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBanUser(user.id)}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Ban
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.id)}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {claims.map(claim => (
                    <div key={claim.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{claim.businessName}</h3>
                          <p className="text-muted-foreground">Claimed by {claim.ownerName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{claim.role}</Badge>
                            <Badge variant="secondary">
                              {new Date(claim.submittedAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Contact Email</p>
                          <p className="font-medium">{claim.ownerEmail}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Contact Phone</p>
                          <p className="font-medium">{claim.ownerPhone}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveListing(claim.id, 'claim')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(claim);
                            setIsRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {claims.length === 0 && (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No pending listings</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reported Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportedReviews.map(report => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">Review Report #{report.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            Reported by {report.reportedBy} • {new Date(report.reportedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {report.reason}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismissReport(report.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveReview(report.reviewId)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Review
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Review
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {reportedReviews.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No reported reviews</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {pricingPlans.map(plan => (
                    <div key={plan.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <Badge variant={plan.priceMonthly === 0 ? 'secondary' : 'default'}>
                          {plan.priceMonthly === 0 ? 'Free' : `BD ${plan.priceMonthly}/month`}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-6">
                        {plan.features.map((feature: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Plan
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premium Tab */}
          <TabsContent value="premium" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Premium Placements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {premiumPlacements.map((businessId, index) => (
                    <div key={businessId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Business {businessId}</p>
                          <p className="text-sm text-muted-foreground">Premium placement</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Premium Placement
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Reason for rejection</label>
                <Textarea
                  placeholder="Please provide a reason for rejecting this listing..."
                  value={rejectReason}
                  onChange={(e: any) => setRejectReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRejectListing} disabled={!rejectReason.trim()}>
                  Reject Listing
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}