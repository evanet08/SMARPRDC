"""
Unmanaged models reflecting the existing MySQL tables in db_rdc_enf.
These models are READ-ONLY — Django will not create or alter these tables.
"""

from django.db import models


class Etudiant(models.Model):
    """Table: etudiant"""
    id = models.AutoField(primary_key=True)
    nom = models.CharField(max_length=255, null=True, blank=True)
    postnom = models.CharField(max_length=255, null=True, blank=True)
    prenom = models.CharField(max_length=255, null=True, blank=True)
    sexe = models.CharField(max_length=1, null=True, blank=True)
    id_province = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'etudiant'


class EtudiantInscription(models.Model):
    """Table: etudiant_inscription"""
    id = models.AutoField(primary_key=True)
    id_etudiant = models.IntegerField(null=True, blank=True)
    id_annee = models.IntegerField(null=True, blank=True)
    id_classe = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'etudiant_inscription'


class Classe(models.Model):
    """Table: classe"""
    id = models.AutoField(primary_key=True)
    designation = models.CharField(max_length=255, null=True, blank=True)
    id_promotion = models.IntegerField(null=True, blank=True)
    id_service = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'classe'


class Promotion(models.Model):
    """Table: promotion"""
    id = models.AutoField(primary_key=True)
    designation = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'promotion'


class Province(models.Model):
    """Table: province"""
    id = models.AutoField(primary_key=True)
    designation = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'province'


class Service(models.Model):
    """Table: service (or département)"""
    id = models.AutoField(primary_key=True)
    designation = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'service'


class Grade(models.Model):
    """Table: grade"""
    id = models.AutoField(primary_key=True)
    designation = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'grade'


class Personnel(models.Model):
    """Table: personnel"""
    id = models.AutoField(primary_key=True)
    nom = models.CharField(max_length=255, null=True, blank=True)
    postnom = models.CharField(max_length=255, null=True, blank=True)
    prenom = models.CharField(max_length=255, null=True, blank=True)
    sexe = models.CharField(max_length=1, null=True, blank=True)
    id_grade = models.IntegerField(null=True, blank=True)
    isAdministratif = models.IntegerField(default=0)
    en_fonction = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'personnel'
