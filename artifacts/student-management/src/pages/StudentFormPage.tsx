import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Upload, Trash2, Camera, Loader2, Save, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import {
  useGetStudent, useCreateStudent, useUpdateStudent, useDeleteStudent,
  getGetStudentQueryKey, getListStudentsQueryKey, Gender
} from "@workspace/api-client-react";
import { studentSchema, StudentFormValues } from "@/lib/schemas";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { getPhotoSrc } from "@/lib/utils";

export default function StudentFormPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNew = !params.id || params.id === "new";
  const studentId = isNew ? 0 : Number(params.id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadPhoto, isUploading, uploadError, setUploadError } = usePhotoUpload();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      course: "",
      year: 1,
      dateOfBirth: "",
      email: "",
      mobileNumber: "",
      gender: "" as StudentFormValues["gender"],
      address: "",
      photoUrl: null,
    },
  });

  const { data: student, isLoading: isLoadingStudent } = useGetStudent(studentId, {
    query: { enabled: !isNew, queryKey: getGetStudentQueryKey(studentId) },
  });

  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Student dropped", description: "Record has been removed." });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setLocation("/students");
      },
      onError: (err) => {
        toast({ 
          title: "Delete failed", 
          description: err.data?.error || "An unexpected error occurred", 
          variant: "destructive" 
        });
      }
    }
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (student && initializedForId.current !== student.id) {
      initializedForId.current = student.id;
      form.reset({
        name: student.name,
        course: student.course,
        year: student.year,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : "",
        email: student.email,
        mobileNumber: student.mobileNumber,
        gender: student.gender,
        address: student.address,
        photoUrl: student.photoUrl,
      });
    }
  }, [student, form]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file);
    if (url) {
      form.setValue("photoUrl", url, { shouldDirty: true, shouldValidate: true });
    }
  };

  const onSubmit = (data: StudentFormValues) => {
    // Format date string to ensure it's a valid date representation, even if it's already YYYY-MM-DD
    const payload = { ...data };

    if (isNew) {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: (newStudent) => {
            toast({ title: "Student created", description: `${newStudent.name} added successfully.` });
            queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
            setLocation(`/students/${newStudent.id}`);
          },
          onError: (err) => {
            toast({ 
              title: "Failed to create student", 
              description: err.data?.error || "Please check the form for errors.",
              variant: "destructive" 
            });
          }
        }
      );
    } else {
      updateMutation.mutate(
        { id: studentId, data: payload },
        {
          onSuccess: (updatedStudent) => {
            toast({ title: "Student updated", description: `Record for ${updatedStudent.name} updated.` });
            queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
            queryClient.setQueryData(getGetStudentQueryKey(studentId), updatedStudent);
          },
          onError: (err) => {
            toast({ 
              title: "Failed to update student", 
              description: err.data?.error || "Please check the form for errors.",
              variant: "destructive" 
            });
          }
        }
      );
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const currentPhotoUrl = form.watch("photoUrl");
  const currentName = form.watch("name");

  if (!isNew && isLoadingStudent) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/students")} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold tracking-tight">
                {isNew ? "Add Student" : "Edit Student"}
              </h1>
              {!isNew && student && (
                <Badge variant="secondary" className="font-mono bg-muted/50 text-muted-foreground border-transparent">
                  {student.admissionNumber}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isNew ? "Create a new student record." : "Update existing student information."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isNew && (
            <Button 
              type="button" 
              variant="destructive" 
              className="flex-1 sm:flex-none"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Drop
            </Button>
          )}
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving}
            className="flex-1 sm:flex-none hover-elevate-2 shadow-sm font-medium"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Record
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="xl:col-span-2 space-y-8">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>Basic identifying information and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Jane Doe" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jane@example.com" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1 (555) 000-0000" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select key={field.value || "unset"} onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={Gender.Male}>Male</SelectItem>
                            <SelectItem value={Gender.Female}>Female</SelectItem>
                            <SelectItem value={Gender.Other}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Full residential address..." 
                          className="resize-none min-h-[100px] bg-background" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Academic Enrollment</CardTitle>
                <CardDescription>Program and academic year assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="course"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course / Program</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Computer Science" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Year</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} max={8} 
                            className="bg-background"
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Student Photo</CardTitle>
                <CardDescription>Official ID photograph.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative group mb-6">
                  <Avatar className="w-48 h-48 border-4 border-background shadow-md">
                    {currentPhotoUrl ? (
                      <AvatarImage src={getPhotoSrc(currentPhotoUrl)} alt="Student photo" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-muted text-muted-foreground text-4xl">
                      {currentName ? currentName.substring(0, 2).toUpperCase() : <User className="w-16 h-16 opacity-50" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      className="rounded-full font-medium"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                      Change
                    </Button>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                {uploadError && (
                  <p className="text-sm text-destructive font-medium mb-4">{uploadError}</p>
                )}

                <div className="text-center w-full">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Supported formats: JPEG, PNG. Max size 5MB.
                  </p>
                </div>
              </CardContent>
            </Card>

            {!isNew && student && (
              <Card className="shadow-sm border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Record Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admission No.</span>
                    <span className="font-mono font-medium">{student.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{new Date(student.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{new Date(student.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </Form>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for <strong className="text-foreground">{student?.name}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate({ id: studentId });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Dropping..." : "Drop Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
