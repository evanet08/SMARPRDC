"""
Unmanaged models reflecting the existing MySQL tables in db_rdc_enf.
These models are READ-ONLY — Django will not create or alter these tables.
"""

from django.db import models


class Etudiant(models.Model):
    """Table: etudiant"""
    id_etudiant = models.AutoField(primary_key=True)
    genre = models.CharField(max_length=10, null=True, blank=True)
    province_provenance = models.CharField(max_length=255, null=True, blank=True)
    id_service = models.IntegerField(null=True, blank=True)
    id_grade_administratif = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'etudiant'


class EtudiantInscription(models.Model):
    """Table: etudiant_inscription"""
    id_inscription = models.AutoField(primary_key=True)
    id_etudiant = models.IntegerField(null=True, blank=True)
    id_annee = models.IntegerField(null=True, blank=True)
    id_classe = models.IntegerField(null=True, blank=True)
    jourSoir = models.CharField(max_length=50, null=True, blank=True)
    groupe = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'etudiant_inscription'


class Classe(models.Model):
    """Table: classe"""
    id_classe = models.AutoField(primary_key=True)
    Classe = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'classe'


class PersonnelService(models.Model):
    """Table: personnel_service"""
    id_service = models.AutoField(primary_key=True)
    service = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'personnel_service'


class PersonnelGradeAdministratif(models.Model):
    """Table: personnel_grade_administratif"""
    id_grade_administratif = models.AutoField(primary_key=True)
    code = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'personnel_grade_administratif'


class Personnel(models.Model):
    """Table: personnel"""
    id_personnel = models.AutoField(primary_key=True)
    genre = models.CharField(max_length=10, null=True, blank=True)
    id_grade_administratif = models.IntegerField(null=True, blank=True)
    isAdministratif = models.IntegerField(default=0)
    en_fonction = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'personnel'
